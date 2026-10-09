// Consultas do painel da plataforma (/plataforma): enxergam TODAS as lojas.
// Só podem ser chamadas depois de exigirPlataforma().
import "server-only";
import type { StatusLoja } from "@/generated/prisma/enums";
import { prisma } from "./prisma";
import { somarDias } from "./format";

export type LojaDaPlataforma = {
  id: number;
  slug: string;
  nome: string;
  cidade: string;
  uf: string;
  status: StatusLoja;
  ativa: boolean;
  createdAt: Date;
  agendamentos30: number;
  faturamento30: number; // centavos
  nota: number | null;
  totalAvaliacoes: number;
  ultimoAcessoDono: Date | null;
};

// PENDENTE primeiro: é o que precisa de uma decisão
const ORDEM_STATUS: Record<StatusLoja, number> = { PENDENTE: 0, ATIVA: 1, SUSPENSA: 2 };

/**
 * Todas as lojas com os números dos últimos 30 dias (hoje incluso).
 * Agendamentos: os marcados pro período, sem cancelados e faltas.
 * Faturamento: valor pago nos concluídos do período.
 * São 4 consultas no total (groupBy por loja), não uma por loja.
 */
export async function lojasDaPlataforma(hoje: string): Promise<LojaDaPlataforma[]> {
  const periodo = { gte: somarDias(hoje, -29), lte: hoje };

  const [lojas, agendamentos, faturamento, notas] = await Promise.all([
    prisma.loja.findMany({
      select: {
        id: true,
        slug: true,
        nome: true,
        cidade: true,
        uf: true,
        status: true,
        ativa: true,
        createdAt: true,
        usuarios: { where: { papel: "ADMIN" }, select: { ultimoAcesso: true } },
      },
    }),
    prisma.agendamento.groupBy({
      by: ["lojaId"],
      where: { data: periodo, status: { notIn: ["CANCELADO", "NAO_COMPARECEU"] } },
      _count: true,
    }),
    prisma.agendamento.groupBy({
      by: ["lojaId"],
      where: { data: periodo, status: "CONCLUIDO" },
      _sum: { valorPago: true },
    }),
    prisma.avaliacao.groupBy({ by: ["lojaId"], _avg: { nota: true }, _count: true }),
  ]);

  return lojas
    .map(({ usuarios, ...loja }) => {
      const nota = notas.find((n) => n.lojaId === loja.id);
      const acessos = usuarios.flatMap((u) => (u.ultimoAcesso ? [u.ultimoAcesso.getTime()] : []));
      return {
        ...loja,
        agendamentos30: agendamentos.find((a) => a.lojaId === loja.id)?._count ?? 0,
        faturamento30: faturamento.find((f) => f.lojaId === loja.id)?._sum.valorPago ?? 0,
        nota: nota?._avg.nota ?? null,
        totalAvaliacoes: nota?._count ?? 0,
        ultimoAcessoDono: acessos.length ? new Date(Math.max(...acessos)) : null,
      };
    })
    .sort(
      (a, b) => ORDEM_STATUS[a.status] - ORDEM_STATUS[b.status] || b.createdAt.getTime() - a.createdAt.getTime(),
    );
}
