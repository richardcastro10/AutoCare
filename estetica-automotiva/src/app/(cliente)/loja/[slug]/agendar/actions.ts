"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { TipoVeiculo } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { getLojaCompleta, lojaPublicada } from "@/lib/catalogo";
import { cabeNoHorario, gerarCodigo, horariosLivres } from "@/lib/agenda";
import { STATUS_ATIVOS } from "@/lib/constantes";
import { dataValida, formatarPlaca } from "@/lib/format";
import { clienteAtual } from "@/lib/dal";

/** Chamada pela tela de data quando o cliente escolhe um dia */
export async function buscarHorarios(lojaId: number, data: string, servicoIds: number[]) {
  if (!dataValida(data)) return [];
  const loja = await getLojaCompleta(lojaId);
  // loja pendente, suspensa ou desligada pelo dono não tem horário (nem na prévia)
  if (!loja || !lojaPublicada(loja)) return [];
  const duracao = loja.servicos
    .filter((s) => servicoIds.includes(s.id))
    .reduce((total, s) => total + s.duracaoMin, 0);
  return horariosLivres(loja, data, duracao);
}


const esquema = z.object({
  lojaId: z.coerce.number().int(),
  servicoIds: z.array(z.coerce.number().int()).min(1, "Escolha um serviço"),
  data: z.string().refine(dataValida, "Escolha a data"),
  inicio: z.coerce.number().int().min(0).max(24 * 60),
  // veículo já cadastrado OU um novo
  veiculoId: z.coerce.number().int().optional(),
  novoTipo: z.enum(TipoVeiculo).optional(),
  novoModelo: z.string().trim().max(60).default(""),
  novaPlaca: z.string().transform(formatarPlaca).default(""),
  observacoes: z.string().trim().max(300).default(""),
});

export type EstadoAgendamento = { erro: string; horarioOcupado?: boolean; precisaEntrar?: boolean } | undefined;

export async function confirmarAgendamento(
  _anterior: EstadoAgendamento,
  formData: FormData,
): Promise<EstadoAgendamento> {
  const texto = (campo: string) => {
    const valor = formData.get(campo);
    return typeof valor === "string" && valor !== "" ? valor : undefined;
  };
  const resultado = esquema.safeParse({
    lojaId: texto("lojaId"),
    servicoIds: formData.getAll("servicoIds"),
    data: texto("data"),
    inicio: texto("inicio"),
    veiculoId: texto("veiculoId"),
    novoTipo: texto("novoTipo"),
    novoModelo: texto("novoModelo"),
    novaPlaca: texto("novaPlaca"),
    observacoes: texto("observacoes"),
  });
  if (!resultado.success) return { erro: resultado.error.issues[0]?.message ?? "Confira os dados" };
  const dados = resultado.data;

  const loja = await getLojaCompleta(dados.lojaId);
  // vale pra qualquer um, inclusive quem está vendo a prévia de uma loja não publicada
  if (!loja || !lojaPublicada(loja)) return { erro: "Essa loja não está aceitando agendamentos agora." };

  // ---- quem é o cliente ----
  // Sempre o da conta logada (nome e celular vêm dela). O formulário não manda nome nem
  // telefone. Escolher serviço, veículo, dia e horário não precisa de login; confirmar precisa.
  const cliente = await clienteAtual();
  if (!cliente) return { erro: "Entre na sua conta pra confirmar o agendamento.", precisaEntrar: true };
  if (cliente.senhaTemporaria) {
    return { erro: "Crie uma senha nova antes de agendar.", precisaEntrar: true };
  }

  // ---- qual o veículo ----
  // só os veículos da conta (os cadastrados no balcão não aparecem pro cliente)
  const veiculoSalvo = dados.veiculoId
    ? await prisma.veiculo.findFirst({ where: { id: dados.veiculoId, clienteId: cliente.id, origem: "APP" } })
    : null;

  const tipo = veiculoSalvo?.tipo ?? dados.novoTipo;
  if (!tipo) return { erro: "Escolha o veículo." };
  if (!veiculoSalvo && !dados.novoModelo) return { erro: "Informe o modelo do veículo." };

  // ---- preço e duração SEMPRE do banco (nunca do navegador) ----
  const servicos = await prisma.servico.findMany({
    where: { id: { in: dados.servicoIds }, lojaId: loja.id, ativo: true },
    include: { precos: { where: { tipoVeiculo: tipo } } },
  });
  if (servicos.length !== dados.servicoIds.length) return { erro: "Esse serviço não está mais disponível." };
  if (servicos.some((s) => s.precos.length === 0)) {
    return { erro: "Esse serviço não é feito para esse tipo de veículo." };
  }
  const duracao = servicos.reduce((t, s) => t + s.duracaoMin, 0);
  const fim = dados.inicio + duracao;

  // confere se o horário ainda está livre (dia aberto, antecedência, lotação)
  const livres = await horariosLivres(loja, dados.data, duracao);
  if (!livres.includes(dados.inicio)) {
    return { erro: "Esse horário acabou de ser ocupado. Escolha outro.", horarioOcupado: true };
  }

  let destino: string;

  try {
    // a transação devolve pra onde mandar o cliente
    const resultado = await prisma.$transaction(async (tx) => {
      // evita o mesmo cliente marcar duas vezes no mesmo horário (ex.: clicou duas vezes)
      const duplicado = await tx.agendamento.findFirst({
        where: {
          clienteId: cliente.id,
          lojaId: loja.id,
          origem: "APP",
          data: dados.data,
          status: { in: ["PENDENTE", "CONFIRMADO", "EM_ANDAMENTO"] },
          inicio: { lt: fim },
          fim: { gt: dados.inicio },
        },
      });
      if (duplicado) return { codigo: duplicado.codigo, novo: false };

      // confere de novo dentro da transação, pra dois clientes não pegarem a última vaga juntos
      const ocupados = await tx.agendamento.findMany({
        where: { lojaId: loja.id, data: dados.data, status: { in: STATUS_ATIVOS } },
        select: { inicio: true, fim: true },
      });
      if (!cabeNoHorario(ocupados, dados.inicio, fim, loja.vagasSimultaneas)) throw new Error("HORARIO_OCUPADO");

      // veículo novo fica salvo na conta (origem APP). Mesma placa já cadastrada
      // (inclusive no balcão): reaproveita e passa a aparecer na conta.
      let veiculo = veiculoSalvo;
      if (!veiculo && dados.novaPlaca) {
        const mesmaPlaca = await tx.veiculo.findFirst({ where: { clienteId: cliente.id, placa: dados.novaPlaca } });
        if (mesmaPlaca) {
          veiculo = await tx.veiculo.update({ where: { id: mesmaPlaca.id }, data: { origem: "APP" } });
        }
      }
      if (!veiculo) {
        veiculo = await tx.veiculo.create({
          data: { clienteId: cliente.id, tipo, modelo: dados.novoModelo, placa: dados.novaPlaca, origem: "APP" },
        });
      }

      const criado = await tx.agendamento.create({
        data: {
          codigo: gerarCodigo(),
          lojaId: loja.id,
          clienteId: cliente.id,
          veiculoId: veiculo.id,
          data: dados.data,
          inicio: dados.inicio,
          fim,
          observacoes: dados.observacoes,
          origem: "APP",
          total: servicos.reduce((t, s) => t + s.precos[0].preco, 0),
          itens: {
            create: servicos.map((s) => ({
              servicoId: s.id,
              nomeServico: s.nome,
              preco: s.precos[0].preco,
              duracaoMin: s.duracaoMin,
            })),
          },
        },
      });
      return { codigo: criado.codigo, novo: true };
    });

    destino = `/agendamento/${resultado.codigo}${resultado.novo ? "?novo=1" : ""}`;
  } catch (e) {
    if (e instanceof Error && e.message === "HORARIO_OCUPADO") {
      return { erro: "Esse horário acabou de ser ocupado. Escolha outro.", horarioOcupado: true };
    }
    console.error(e);
    return { erro: "Não foi possível agendar agora. Tente de novo em instantes." };
  }

  // redirect fica FORA do try/catch (ele funciona lançando um erro especial)
  redirect(destino);
}
