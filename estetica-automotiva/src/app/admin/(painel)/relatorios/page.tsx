import type { Metadata } from "next";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { exigirDono } from "@/lib/dal";
import { resultadoMensal } from "@/lib/relatorios";
import { formatarMes, formatarMoeda, hojeISO, somarDias } from "@/lib/format";
import { Cabecalho, Carregando, Secao, Vazio } from "@/components/admin/ui";
import { BarrasHorizontais } from "@/components/admin/graficos";

export const metadata: Metadata = { title: "Relatórios" };

export default function Relatorios() {
  return (
    <Suspense fallback={<Carregando />}>
      <Conteudo />
    </Suspense>
  );
}

async function Conteudo() {
  const { lojaId } = await exigirDono();
  const hoje = hojeISO();
  const inicio90 = somarDias(hoje, -89);

  const [meses, itens, avaliacoes, perdidos] = await Promise.all([
    resultadoMensal(lojaId, hoje.slice(0, 7), 6),
    prisma.agendamentoItem.findMany({
      where: { agendamento: { lojaId, status: "CONCLUIDO", data: { gte: inicio90 } } },
      select: { nomeServico: true, preco: true },
    }),
    prisma.avaliacao.aggregate({ where: { lojaId }, _avg: { nota: true }, _count: true }),
    prisma.agendamento.groupBy({
      by: ["status"],
      where: { lojaId, data: { gte: inicio90, lte: hoje } },
      _count: true,
    }),
  ]);

  const porServico = new Map<string, { quantidade: number; valor: number }>();
  for (const i of itens) {
    const atual = porServico.get(i.nomeServico) ?? { quantidade: 0, valor: 0 };
    porServico.set(i.nomeServico, { quantidade: atual.quantidade + 1, valor: atual.valor + i.preco });
  }
  const ranking = [...porServico].sort((a, b) => b[1].valor - a[1].valor);

  const total = perdidos.reduce((t, p) => t + p._count, 0);
  const faltas = perdidos.find((p) => p.status === "NAO_COMPARECEU")?._count ?? 0;
  const cancelados = perdidos.find((p) => p.status === "CANCELADO")?._count ?? 0;
  const totais = meses.reduce(
    (t, m) => ({ receita: t.receita + m.receita, lucro: t.lucro + m.lucro, atendimentos: t.atendimentos + m.atendimentos }),
    { receita: 0, lucro: 0, atendimentos: 0 },
  );

  return (
    <div className="space-y-6">
      <Cabecalho titulo="Relatórios" descricao="Como a loja está indo mês a mês.">
        <a href="/admin/relatorios/csv" className="btn-secundario" download>
          Baixar planilha (CSV)
        </a>
      </Cabecalho>

      <Secao titulo="Últimos 6 meses">
        <div className="overflow-x-auto">
          <table className="tabela mt-2 min-w-[720px]">
            <thead>
              <tr>
                <th>Mês</th>
                <th className="text-right">Serviços</th>
                <th className="text-right">Faturamento</th>
                <th className="text-right">Ticket médio</th>
                <th className="text-right">Produtos</th>
                <th className="text-right">Despesas</th>
                <th className="text-right">Lucro</th>
              </tr>
            </thead>
            <tbody>
              {meses.map((m) => (
                <tr key={m.mes}>
                  <td className="first-letter:uppercase">{formatarMes(m.mes)}</td>
                  <td className="text-right tabular-nums">{m.atendimentos}</td>
                  <td className="text-right tabular-nums">{formatarMoeda(m.receita)}</td>
                  <td className="text-right tabular-nums">{formatarMoeda(m.ticketMedio)}</td>
                  <td className="text-right tabular-nums text-texto-suave">{formatarMoeda(m.custoInsumos)}</td>
                  <td className="text-right tabular-nums text-texto-suave">{formatarMoeda(m.despesas)}</td>
                  <td className={`text-right font-medium tabular-nums ${m.lucro >= 0 ? "text-menta" : "text-perigo"}`}>
                    {formatarMoeda(m.lucro)}
                  </td>
                </tr>
              ))}
              <tr>
                <td className="font-semibold">Total</td>
                <td className="text-right font-semibold tabular-nums">{totais.atendimentos}</td>
                <td className="text-right font-semibold tabular-nums">{formatarMoeda(totais.receita)}</td>
                <td colSpan={3} />
                <td className={`text-right font-semibold tabular-nums ${totais.lucro >= 0 ? "text-menta" : "text-perigo"}`}>
                  {formatarMoeda(totais.lucro)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Secao>

      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <Secao titulo="Serviços que mais faturaram (90 dias)">
          <div className="p-4 pt-5">
            {ranking.length ? (
              <BarrasHorizontais
                itens={ranking.map(([nome, s]) => ({
                  rotulo: nome,
                  valor: s.valor,
                  texto: `${s.quantidade}x  ${formatarMoeda(s.valor)}`,
                }))}
              />
            ) : (
              <Vazio>Nenhum serviço concluído nos últimos 90 dias.</Vazio>
            )}
          </div>
        </Secao>

        <Secao titulo="Qualidade (90 dias)">
          <dl className="grid grid-cols-2 gap-4 p-4 pt-5">
            <div>
              <dt className="text-sm text-texto-suave">Nota média no app</dt>
              <dd className="text-2xl font-semibold tabular-nums">
                {avaliacoes._avg.nota ? avaliacoes._avg.nota.toFixed(1).replace(".", ",") : "-"}
              </dd>
              <dd className="text-xs text-texto-suave">{avaliacoes._count} avaliações no total</dd>
            </div>
            <div>
              <dt className="text-sm text-texto-suave">Faltas</dt>
              <dd className="text-2xl font-semibold tabular-nums">{total ? Math.round((faltas / total) * 100) : 0}%</dd>
              <dd className="text-xs text-texto-suave">{faltas} clientes não vieram</dd>
            </div>
            <div>
              <dt className="text-sm text-texto-suave">Cancelamentos</dt>
              <dd className="text-2xl font-semibold tabular-nums">
                {total ? Math.round((cancelados / total) * 100) : 0}%
              </dd>
              <dd className="text-xs text-texto-suave">{cancelados} de {total} agendamentos</dd>
            </div>
          </dl>
        </Secao>
      </div>
    </div>
  );
}
