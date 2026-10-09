// Consultas de números usadas no Painel e no Financeiro
import "server-only";
import type { FormaPagamento, TipoVeiculo } from "@/generated/prisma/enums";
import { prisma } from "./prisma";
import { fimDoMes, somarDias, somarMeses } from "./format";

/**
 * Números de um mês ("YYYY-MM"). Com `ateDia`, considera só do dia 1 até esse dia
 * (serve pra comparar "1 a 8 de outubro" com "1 a 8 de setembro").
 */
export async function resumoDoMes(lojaId: number, mes: string, ateDia?: number) {
  const inicio = `${mes}-01`;
  const ultimoDia = fimDoMes(mes);
  const fim = ateDia
    ? [`${mes}-${String(ateDia).padStart(2, "0")}`, ultimoDia].sort()[0]
    : ultimoDia;
  const periodo = { gte: inicio, lte: fim };

  const [concluidos, consumo, despesas, perdidos] = await Promise.all([
    prisma.agendamento.findMany({
      where: { lojaId, status: "CONCLUIDO", data: periodo },
      select: {
        valorPago: true,
        desconto: true,
        formaPagamento: true,
        veiculo: { select: { tipo: true } },
        itens: { select: { nomeServico: true, preco: true } },
      },
    }),
    prisma.movimentoEstoque.aggregate({
      _sum: { custoTotal: true },
      where: { tipo: "SAIDA", agendamento: { lojaId, data: periodo } },
    }),
    prisma.despesa.findMany({ where: { lojaId, data: periodo }, orderBy: { data: "desc" } }),
    prisma.agendamento.count({
      where: { lojaId, status: { in: ["CANCELADO", "NAO_COMPARECEU"] }, data: periodo },
    }),
  ]);

  const receita = concluidos.reduce((t, a) => t + (a.valorPago ?? 0), 0);
  const descontos = concluidos.reduce((t, a) => t + a.desconto, 0);
  const custoInsumos = consumo._sum.custoTotal ?? 0;
  const totalDespesas = despesas.reduce((t, d) => t + d.valor, 0);

  const porPagamento = new Map<FormaPagamento, number>();
  const porVeiculo = new Map<TipoVeiculo, number>();
  const porServico = new Map<string, { quantidade: number; valor: number }>();
  for (const a of concluidos) {
    if (a.formaPagamento) {
      porPagamento.set(a.formaPagamento, (porPagamento.get(a.formaPagamento) ?? 0) + (a.valorPago ?? 0));
    }
    porVeiculo.set(a.veiculo.tipo, (porVeiculo.get(a.veiculo.tipo) ?? 0) + 1);
    for (const item of a.itens) {
      const atual = porServico.get(item.nomeServico) ?? { quantidade: 0, valor: 0 };
      porServico.set(item.nomeServico, { quantidade: atual.quantidade + 1, valor: atual.valor + item.preco });
    }
  }

  const porCategoria = new Map<string, number>();
  for (const d of despesas) porCategoria.set(d.categoria, (porCategoria.get(d.categoria) ?? 0) + d.valor);

  return {
    receita,
    descontos,
    atendimentos: concluidos.length,
    ticketMedio: concluidos.length ? Math.round(receita / concluidos.length) : 0,
    custoInsumos,
    totalDespesas,
    lucro: receita - custoInsumos - totalDespesas,
    perdidos,
    despesas,
    porPagamento: [...porPagamento].sort((a, b) => b[1] - a[1]),
    porVeiculo: [...porVeiculo].sort((a, b) => b[1] - a[1]),
    porServico: [...porServico].sort((a, b) => b[1].quantidade - a[1].quantidade),
    porCategoria: [...porCategoria].sort((a, b) => b[1] - a[1]),
  };
}

/** Faturamento (valor pago) por dia, de `dias` atrás até hoje */
export async function receitaPorDia(lojaId: number, hoje: string, dias: number) {
  const inicio = somarDias(hoje, -(dias - 1));
  const concluidos = await prisma.agendamento.findMany({
    where: { lojaId, status: "CONCLUIDO", data: { gte: inicio, lte: hoje } },
    select: { data: true, valorPago: true },
  });
  return Array.from({ length: dias }, (_, i) => {
    const data = somarDias(inicio, i);
    const valor = concluidos.filter((a) => a.data === data).reduce((t, a) => t + (a.valorPago ?? 0), 0);
    return { data, valor };
  });
}

export type LinhaMensal = {
  mes: string;
  atendimentos: number;
  receita: number;
  custoInsumos: number;
  despesas: number;
  lucro: number;
  ticketMedio: number;
};

/** Resultado mês a mês, do mais antigo pro mais recente */
export async function resultadoMensal(lojaId: number, mesAtual: string, meses: number): Promise<LinhaMensal[]> {
  const lista = Array.from({ length: meses }, (_, i) => somarMeses(mesAtual, i - meses + 1));
  return Promise.all(
    lista.map(async (mes) => {
      const r = await resumoDoMes(lojaId, mes);
      return {
        mes,
        atendimentos: r.atendimentos,
        receita: r.receita,
        custoInsumos: r.custoInsumos,
        despesas: r.totalDespesas,
        lucro: r.lucro,
        ticketMedio: r.ticketMedio,
      };
    }),
  );
}
