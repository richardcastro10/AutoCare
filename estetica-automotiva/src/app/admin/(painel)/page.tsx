import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { exigirDono } from "@/lib/dal";
import { receitaPorDia, resumoDoMes } from "@/lib/relatorios";
import { COR_VEICULO, DIAS_SEMANA_SIGLA, NOME_VEICULO } from "@/lib/constantes";
import {
  diaDaSemana,
  formatarDataCurta,
  formatarMoeda,
  hojeISO,
  minutosParaHora,
  somarDias,
  somarMeses,
} from "@/lib/format";
import { Carregando, Numero, Secao, Vazio, Variacao } from "@/components/admin/ui";
import { BarrasHorizontais, LinhaFaturamento, Rosca } from "@/components/admin/graficos";
import { StatusChip } from "@/components/status-chip";
import { IconeCaixa, IconeCalendario, IconeCheckCirculo, IconeCifrao } from "@/components/icones";

export const metadata: Metadata = { title: "Dashboard" };

export default function Painel(props: PageProps<"/admin">) {
  return (
    <Suspense fallback={<Carregando />}>
      <Conteudo {...props} />
    </Suspense>
  );
}

const porcentagem = (atual: number, anterior: number) =>
  anterior ? Math.round(((atual - anterior) / anterior) * 100) : null;

async function Conteudo({ searchParams }: PageProps<"/admin">) {
  const { lojaId } = await exigirDono();
  const { periodo } = await searchParams;
  const dias = periodo === "30" ? 30 : 7;

  const hoje = hojeISO();
  const ontem = somarDias(hoje, -1);
  const mes = hoje.slice(0, 7);
  const ativos = { notIn: ["CANCELADO" as const, "NAO_COMPARECEU" as const] };

  const [resumo, resumoAnterior, porDia, agendaHoje, qtdOntem, produtos] = await Promise.all([
    resumoDoMes(lojaId, mes),
    resumoDoMes(lojaId, somarMeses(mes, -1), Number(hoje.slice(8))), // mesmo período do mês passado
    receitaPorDia(lojaId, hoje, dias),
    prisma.agendamento.findMany({
      where: { lojaId, data: hoje, status: ativos },
      include: { veiculo: true, itens: { select: { nomeServico: true } } },
      orderBy: { inicio: "asc" },
    }),
    prisma.agendamento.count({ where: { lojaId, data: ontem, status: ativos } }),
    prisma.produto.findMany({ where: { lojaId, ativo: true }, select: { estoqueAtual: true, estoqueMinimo: true } }),
  ]);

  const concluidosHoje = agendaHoje.filter((a) => a.status === "CONCLUIDO").length;
  const estoqueBaixo = produtos.filter((p) => p.estoqueAtual <= p.estoqueMinimo).length;
  const totalServicos = resumo.porServico.reduce((t, [, s]) => t + s.quantidade, 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="titulo text-2xl">Dashboard</h1>
          <p className="mt-1 text-sm text-texto-suave">Visão geral do seu negócio</p>
        </div>
        <Link href="/admin/agendamentos/novo" className="btn-primario">
          Novo agendamento
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
        <Numero
          icone={<IconeCifrao className="size-6" />}
          cor="menta"
          rotulo="Faturamento do mês"
          valor={formatarMoeda(resumo.receita)}
          detalhe={<Variacao valor={porcentagem(resumo.receita, resumoAnterior.receita)} texto="em relação ao mês anterior" />}
        />
        <Numero
          icone={<IconeCalendario className="size-6" />}
          cor="info"
          rotulo="Agendamentos hoje"
          valor={agendaHoje.length}
          detalhe={<Variacao valor={porcentagem(agendaHoje.length, qtdOntem)} texto="em relação a ontem" />}
        />
        <Numero
          icone={<IconeCheckCirculo className="size-6" />}
          cor="info"
          rotulo="Serviços concluídos"
          valor={concluidosHoje}
          detalhe={
            agendaHoje.length
              ? `${Math.round((concluidosHoje / agendaHoje.length) * 100)}% da agenda de hoje`
              : "Nenhum agendamento hoje"
          }
        />
        <Link href="/admin/estoque" className="block rounded-xl transition-opacity hover:opacity-90">
          <Numero
            icone={<IconeCaixa className="size-6" />}
            cor="dourado"
            rotulo="Estoque baixo"
            valor={`${estoqueBaixo} ${estoqueBaixo === 1 ? "item" : "itens"}`}
            tom={estoqueBaixo ? "alerta" : "normal"}
            detalhe={estoqueBaixo ? "Requer atenção" : "Tudo acima do mínimo"}
          />
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-[1.15fr_1.3fr_1.1fr_1fr]">
        <Secao
          titulo={`Faturamento (${dias} dias)`}
          acao={
            <div className="flex rounded-lg border border-borda p-0.5 text-xs">
              {[7, 30].map((d) => (
                <Link
                  key={d}
                  href={d === 7 ? "?" : "?periodo=30"}
                  className={`whitespace-nowrap rounded-md px-2 py-1 ${dias === d ? "bg-superficie-2 text-texto" : "text-texto-suave"}`}
                >
                  {d} dias
                </Link>
              ))}
            </div>
          }
        >
          <div className="p-4 pt-5">
            <LinhaFaturamento
              dados={porDia.map((d) => ({
                rotulo: dias === 7 ? DIAS_SEMANA_SIGLA[diaDaSemana(d.data)] : formatarDataCurta(d.data),
                detalhe: formatarDataCurta(d.data),
                valor: d.valor,
              }))}
            />
          </div>
        </Secao>

        <Secao
          titulo="Agendamentos de hoje"
          acao={
            <Link href="/admin/agendamentos" className="text-sm text-menta">
              Ver todos
            </Link>
          }
        >
          {agendaHoje.length === 0 ? (
            <Vazio>Nenhum agendamento hoje.</Vazio>
          ) : (
            <ul className="max-h-[17rem] space-y-1.5 overflow-y-auto p-3">
              {agendaHoje.map((a) => (
                <li key={a.id}>
                  <Link
                    href={`/admin/agendamentos/${a.id}`}
                    className="flex items-center gap-3 rounded-lg bg-superficie-2/60 px-3 py-2 hover:bg-superficie-2"
                  >
                    <span className="text-sm tabular-nums text-texto-suave">{minutosParaHora(a.inicio)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm">
                        {a.veiculo.modelo}
                        {a.veiculo.placa && <span className="text-texto-suave"> · {a.veiculo.placa}</span>}
                      </span>
                      <span className="block truncate text-xs text-texto-suave">
                        {a.itens.map((i) => i.nomeServico).join(" + ")}
                      </span>
                    </span>
                    <StatusChip status={a.status} curto />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Secao>

        <Secao
          titulo="Serviços mais realizados"
          acao={
            <Link href="/admin/relatorios" className="text-sm text-menta">
              Ver todos
            </Link>
          }
        >
          <div className="p-4 pt-5">
            {resumo.porServico.length ? (
              <BarrasHorizontais
                itens={resumo.porServico.slice(0, 5).map(([nome, s]) => ({
                  rotulo: nome,
                  valor: s.quantidade,
                  texto: String(s.quantidade),
                  extra: `${Math.round((s.quantidade / totalServicos) * 100)}%`,
                }))}
              />
            ) : (
              <Vazio>Nenhum serviço concluído no mês.</Vazio>
            )}
          </div>
        </Secao>

        <Secao titulo="Tipos de veículos atendidos">
          <div className="p-4 pt-5">
            <Rosca
              rotuloTotal="veículos"
              // ordem fixa (validada): cores vizinhas na rosca bem diferentes entre si
              itens={(["CARRO", "CAMINHONETE", "MOTO", "SUV"] as const).map((tipo) => ({
                rotulo: tipo === "CAMINHONETE" ? "Caminhonetes" : `${NOME_VEICULO[tipo]}s`,
                valor: resumo.porVeiculo.find(([t]) => t === tipo)?.[1] ?? 0,
                cor: COR_VEICULO[tipo],
              }))}
            />
          </div>
        </Secao>
      </div>

      <Link
        href="/admin/financeiro"
        className="painel flex flex-wrap items-center gap-x-8 gap-y-2 px-4 py-3 text-sm hover:border-borda-forte"
      >
        <span className="font-medium">No mês</span>
        <span className="text-texto-suave">
          Produtos usados <strong className="text-texto tabular-nums">{formatarMoeda(resumo.custoInsumos)}</strong>
        </span>
        <span className="text-texto-suave">
          Despesas <strong className="text-texto tabular-nums">{formatarMoeda(resumo.totalDespesas)}</strong>
        </span>
        <span className="text-texto-suave">
          Lucro estimado{" "}
          <strong className={`tabular-nums ${resumo.lucro >= 0 ? "text-menta" : "text-perigo"}`}>
            {formatarMoeda(resumo.lucro)}
          </strong>
        </span>
        <span className="ml-auto text-menta">Abrir financeiro</span>
      </Link>
    </div>
  );
}
