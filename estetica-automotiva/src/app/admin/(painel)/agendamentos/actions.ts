"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { StatusAgendamento, TipoVeiculo, FormaPagamento } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { exigirAdmin } from "@/lib/dal";
import { gerarCodigo } from "@/lib/agenda";
import {
  dataValida,
  formatarPlaca,
  horaParaMinutos,
  lerMoeda,
  somenteDigitos,
} from "@/lib/format";

// Quais mudanças de status fazem sentido a partir de cada status
const TRANSICOES: Record<StatusAgendamento, StatusAgendamento[]> = {
  PENDENTE: ["CONFIRMADO", "CANCELADO"],
  CONFIRMADO: ["EM_ANDAMENTO", "CANCELADO", "NAO_COMPARECEU", "PENDENTE"],
  EM_ANDAMENTO: ["CONFIRMADO"], // concluir tem ação própria (precisa do pagamento)
  CONCLUIDO: [],
  CANCELADO: ["PENDENTE"],
  NAO_COMPARECEU: ["CONFIRMADO"],
};

export async function mudarStatus(id: number, novo: StatusAgendamento) {
  const { lojaId } = await exigirAdmin();
  // sempre filtra pela loja do usuário: ninguém mexe em agendamento de outra loja
  const agendamento = await prisma.agendamento.findFirst({ where: { id, lojaId } });
  if (!agendamento || !TRANSICOES[agendamento.status].includes(novo)) return;

  await prisma.agendamento.update({ where: { id }, data: { status: novo } });
  refresh();
}

/**
 * Conclui o serviço: registra pagamento e dá baixa no estoque
 * dos produtos usados (tudo numa transação: ou salva tudo ou nada).
 */
export async function concluirAgendamento(id: number, formData: FormData) {
  const { lojaId } = await exigirAdmin();

  const forma = z.enum(FormaPagamento).parse(formData.get("formaPagamento"));
  const desconto = lerMoeda(String(formData.get("desconto") ?? "0"));

  // campos "consumo_<produtoId>" com a quantidade usada
  const consumos = [...formData.entries()]
    .filter(([chave]) => chave.startsWith("consumo_"))
    .map(([chave, valor]) => ({
      produtoId: Number(chave.replace("consumo_", "")),
      quantidade: Number(String(valor).replace(",", ".")),
    }))
    .filter((c) => c.produtoId && c.quantidade > 0);

  await prisma.$transaction(async (tx) => {
    const agendamento = await tx.agendamento.findFirst({ where: { id, lojaId }, include: { itens: true } });
    if (!agendamento || agendamento.status === "CONCLUIDO" || agendamento.status === "CANCELADO") {
      return;
    }
    const descontoFinal = Math.min(Math.max(desconto, 0), agendamento.total);

    await tx.agendamento.update({
      where: { id },
      data: {
        status: "CONCLUIDO",
        formaPagamento: forma,
        desconto: descontoFinal,
        valorPago: agendamento.total - descontoFinal,
        concluidoEm: new Date(),
      },
    });

    const servicos = agendamento.itens.map((i) => i.nomeServico).join(" + ");
    for (const c of consumos) {
      const produto = await tx.produto.findFirst({ where: { id: c.produtoId, lojaId } });
      if (!produto) continue;
      const custoUnidade = produto.precoEmbalagem / produto.tamanhoEmbalagem;
      await tx.movimentoEstoque.create({
        data: {
          produtoId: produto.id,
          tipo: "SAIDA",
          quantidade: -c.quantidade,
          custoTotal: Math.round(c.quantidade * custoUnidade),
          motivo: `Uso em ${servicos}`,
          agendamentoId: id,
        },
      });
      await tx.produto.update({
        where: { id: produto.id },
        data: { estoqueAtual: { decrement: c.quantidade } },
      });
    }
  });

  refresh();
}

// ---------- Agendamento feito pelo balcão / telefone ----------

const esquemaBalcao = z.object({
  nome: z.string().trim().min(2, "Informe o nome do cliente"),
  telefone: z
    .string()
    .transform(somenteDigitos)
    .refine((t) => t.length === 10 || t.length === 11, "Telefone inválido (DDD + número)"),
  tipo: z.enum(TipoVeiculo),
  modelo: z.string().trim().min(1, "Informe o modelo"),
  placa: z.string().transform(formatarPlaca),
  servicoIds: z.array(z.coerce.number().int()).min(1, "Escolha pelo menos um serviço"),
  data: z.string().refine(dataValida, "Data inválida"),
  hora: z.string().regex(/^\d{2}:\d{2}$/, "Hora inválida"),
  status: z.enum(["PENDENTE", "CONFIRMADO", "EM_ANDAMENTO"]),
  observacoes: z.string().trim().default(""),
});

export type EstadoBalcao = { erro: string; valores: Record<string, string> } | undefined;

export async function criarAgendamentoBalcao(
  _anterior: EstadoBalcao,
  formData: FormData,
): Promise<EstadoBalcao> {
  const { lojaId } = await exigirAdmin();

  const resultado = esquemaBalcao.safeParse({
    nome: formData.get("nome"),
    telefone: formData.get("telefone"),
    tipo: formData.get("tipo"),
    modelo: formData.get("modelo"),
    placa: formData.get("placa") ?? "",
    servicoIds: formData.getAll("servicoIds"),
    data: formData.get("data"),
    hora: formData.get("hora"),
    status: formData.get("status"),
    observacoes: formData.get("observacoes") ?? "",
  });
  // devolve o que foi digitado, pra o formulário não ser apagado quando der erro
  const valores = Object.fromEntries(
    ["nome", "telefone", "modelo", "placa", "data", "hora", "observacoes"].map((c) => [
      c,
      String(formData.get(c) ?? ""),
    ]),
  );
  if (!resultado.success) return { erro: resultado.error.issues[0].message, valores };
  const d = resultado.data;

  const servicos = await prisma.servico.findMany({
    where: { id: { in: d.servicoIds }, lojaId },
    include: { precos: { where: { tipoVeiculo: d.tipo } } },
  });
  if (servicos.some((s) => s.precos.length === 0)) {
    return { erro: "Algum serviço escolhido não tem preço para esse tipo de veículo.", valores };
  }

  const inicio = horaParaMinutos(d.hora);
  const duracao = servicos.reduce((t, s) => t + s.duracaoMin, 0);

  const agendamento = await prisma.$transaction(async (tx) => {
    const cliente = await tx.cliente.upsert({
      where: { telefone: d.telefone },
      update: { nome: d.nome },
      create: { nome: d.nome, telefone: d.telefone },
    });
    const veiculo =
      (d.placa && (await tx.veiculo.findFirst({ where: { clienteId: cliente.id, placa: d.placa } }))) ||
      (await tx.veiculo.create({
        data: { clienteId: cliente.id, tipo: d.tipo, modelo: d.modelo, placa: d.placa },
      }));

    return tx.agendamento.create({
      data: {
        codigo: gerarCodigo(),
        lojaId,
        clienteId: cliente.id,
        veiculoId: veiculo.id,
        data: d.data,
        inicio,
        fim: inicio + duracao,
        status: d.status,
        observacoes: d.observacoes,
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
  });

  redirect(`/admin/agendamentos/${agendamento.id}`);
}
