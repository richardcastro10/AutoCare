import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { exigirAdmin } from "@/lib/dal";
import { MULTIPLICADOR_CONSUMO, NOME_PAGAMENTO, NOME_VEICULO } from "@/lib/constantes";
import {
  formatarDataHora,
  formatarDataLonga,
  formatarMoeda,
  formatarQuantidade,
  formatarTelefone,
  linkWhatsApp,
  minutosParaHora,
} from "@/lib/format";
import { Cabecalho, Carregando, Secao } from "@/components/admin/ui";
import { StatusChip } from "@/components/status-chip";
import { Placa } from "@/components/placa";
import { IconeVeiculo } from "@/components/icones";
import { BotaoEnviar } from "@/components/admin/botao-enviar";
import { mudarStatus } from "../actions";
import { FormConcluir } from "./form-concluir";

export const metadata: Metadata = { title: "Agendamento" };

export default function DetalheAgendamento(props: PageProps<"/admin/agendamentos/[id]">) {
  return (
    <Suspense fallback={<Carregando />}>
      <Conteudo {...props} />
    </Suspense>
  );
}

async function Conteudo({ params }: PageProps<"/admin/agendamentos/[id]">) {
  const { lojaId } = await exigirAdmin();
  const id = Number((await params).id);
  if (!id) notFound();

  // findFirst com lojaId: agendamento de outra loja vira "não encontrado"
  const a = await prisma.agendamento.findFirst({
    where: { id, lojaId },
    include: {
      cliente: { include: { _count: { select: { agendamentos: { where: { status: "CONCLUIDO" } } } } } },
      veiculo: true,
      itens: { include: { servico: { include: { insumos: { include: { produto: true } } } } } },
      consumos: { include: { produto: true } },
    },
  });
  if (!a) notFound();

  // Sugestão de consumo: ficha técnica dos serviços x multiplicador do tipo de veículo
  const sugestao = new Map<number, { nome: string; unidade: string; quantidade: number; estoque: number }>();
  for (const item of a.itens) {
    for (const insumo of item.servico.insumos) {
      const atual = sugestao.get(insumo.produtoId);
      const qtd = insumo.quantidade * MULTIPLICADOR_CONSUMO[a.veiculo.tipo];
      sugestao.set(insumo.produtoId, {
        nome: insumo.produto.nome,
        unidade: insumo.produto.unidade,
        estoque: insumo.produto.estoqueAtual,
        quantidade: Math.round((atual?.quantidade ?? 0) + qtd),
      });
    }
  }

  const podeConcluir = a.status === "CONFIRMADO" || a.status === "EM_ANDAMENTO" || a.status === "PENDENTE";
  const custoProdutos = a.consumos.reduce((t, c) => t + c.custoTotal, 0);

  const botoes: { status: Parameters<typeof mudarStatus>[1]; rotulo: string; estilo: string }[] = [];
  if (a.status === "PENDENTE") botoes.push({ status: "CONFIRMADO", rotulo: "Confirmar", estilo: "btn-primario" });
  if (a.status === "CONFIRMADO") botoes.push({ status: "EM_ANDAMENTO", rotulo: "Iniciar lavagem", estilo: "btn-primario" });
  if (a.status === "CONFIRMADO") botoes.push({ status: "NAO_COMPARECEU", rotulo: "Não compareceu", estilo: "btn-secundario" });
  if (a.status === "PENDENTE" || a.status === "CONFIRMADO") botoes.push({ status: "CANCELADO", rotulo: "Cancelar", estilo: "btn-perigo" });
  if (a.status === "CANCELADO") botoes.push({ status: "PENDENTE", rotulo: "Reabrir", estilo: "btn-secundario" });
  if (a.status === "NAO_COMPARECEU" || a.status === "EM_ANDAMENTO") botoes.push({ status: "CONFIRMADO", rotulo: "Voltar para confirmado", estilo: "btn-secundario" });

  return (
    <div className="max-w-4xl space-y-6">
      <Link href={`/admin/agendamentos?data=${a.data}`} className="text-sm font-semibold text-menta">
        ‹ Voltar para a agenda
      </Link>
      <Cabecalho
        titulo={`${minutosParaHora(a.inicio)} ${a.cliente.nome.split(" ")[0]}`}
        descricao={
          <span className="first-letter:uppercase">
            {formatarDataLonga(a.data)}, das {minutosParaHora(a.inicio)} às {minutosParaHora(a.fim)}. Código {a.codigo}
          </span>
        }
      >
        <StatusChip status={a.status} curto />
      </Cabecalho>

      {botoes.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {botoes.map((b) => (
            <form key={b.status} action={mudarStatus.bind(null, a.id, b.status)}>
              <BotaoEnviar className={b.estilo} pendente="...">
                {b.rotulo}
              </BotaoEnviar>
            </form>
          ))}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Secao titulo="Cliente">
          <div className="space-y-1 p-4 text-sm">
            <Link href={`/admin/clientes/${a.clienteId}`} className="text-base font-semibold hover:text-menta">
              {a.cliente.nome}
            </Link>
            <p>
              <a
                href={linkWhatsApp(a.cliente.telefone)}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-menta"
              >
                {formatarTelefone(a.cliente.telefone)}
              </a>
            </p>
            <p className="text-texto-suave">
              {a.cliente._count.agendamentos === 0
                ? "Primeira visita"
                : `${a.cliente._count.agendamentos} ${a.cliente._count.agendamentos === 1 ? "serviço concluído" : "serviços concluídos"} antes`}
            </p>
            {a.observacoes && <p className="whitespace-pre-line pt-2 italic text-texto">“{a.observacoes}”</p>}
          </div>
        </Secao>

        <Secao titulo="Veículo">
          <div className="flex items-center gap-4 p-4">
            <IconeVeiculo tipo={a.veiculo.tipo} className="h-8 w-16 text-menta" />
            <div className="flex-1">
              <p className="font-semibold">{a.veiculo.modelo}</p>
              <p className="text-sm text-texto-suave">{NOME_VEICULO[a.veiculo.tipo]}</p>
            </div>
            <Placa placa={a.veiculo.placa} />
          </div>
        </Secao>
      </div>

      <Secao titulo="Serviços">
        <table className="tabela">
          <tbody>
            {a.itens.map((i) => (
              <tr key={i.id}>
                <td>{i.nomeServico}</td>
                <td className="text-right tabular-nums">{formatarMoeda(i.preco)}</td>
              </tr>
            ))}
            {a.desconto > 0 && (
              <tr>
                <td>Desconto</td>
                <td className="text-right tabular-nums text-menta">-{formatarMoeda(a.desconto)}</td>
              </tr>
            )}
            <tr>
              <td className="font-bold">Total</td>
              <td className="text-right font-bold tabular-nums">{formatarMoeda(a.total - a.desconto)}</td>
            </tr>
          </tbody>
        </table>
      </Secao>

      {a.status === "CONCLUIDO" && (
        <Secao titulo="Pagamento e produtos usados">
          <div className="grid gap-4 p-4 sm:grid-cols-3">
            <div>
              <p className="text-sm text-texto-suave">Recebido</p>
              <p className="text-lg font-bold tabular-nums">{formatarMoeda(a.valorPago ?? 0)}</p>
              <p className="text-sm">{a.formaPagamento ? NOME_PAGAMENTO[a.formaPagamento] : ""}</p>
            </div>
            <div>
              <p className="text-sm text-texto-suave">Custo dos produtos</p>
              <p className="text-lg font-bold tabular-nums">{formatarMoeda(custoProdutos)}</p>
            </div>
            <div>
              <p className="text-sm text-texto-suave">Concluído em</p>
              <p className="text-lg font-bold">{a.concluidoEm ? formatarDataHora(a.concluidoEm) : "-"}</p>
            </div>
          </div>
          {a.consumos.length > 0 && (
            <table className="tabela border-t border-borda">
              <thead>
                <tr>
                  <th>Produto</th>
                  <th className="text-right">Quantidade</th>
                  <th className="text-right">Custo</th>
                </tr>
              </thead>
              <tbody>
                {a.consumos.map((c) => (
                  <tr key={c.id}>
                    <td>{c.produto.nome}</td>
                    <td className="text-right tabular-nums">{formatarQuantidade(-c.quantidade, c.produto.unidade)}</td>
                    <td className="text-right tabular-nums">{formatarMoeda(c.custoTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Secao>
      )}

      {podeConcluir && (
        <div id="concluir" className="scroll-mt-6">
          <FormConcluir
            id={a.id}
            total={a.total}
            consumos={[...sugestao].map(([produtoId, s]) => ({ produtoId, ...s }))}
          />
        </div>
      )}
    </div>
  );
}
