import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { exigirAdmin } from "@/lib/dal";
import { NOME_VEICULO } from "@/lib/constantes";
import {
  dataValida,
  formatarData,
  formatarDataLonga,
  formatarMoeda,
  formatarTelefone,
  hojeISO,
  linkWhatsApp,
  minutosParaHora,
  somarDias,
} from "@/lib/format";
import { Cabecalho, Carregando, Secao, Vazio } from "@/components/admin/ui";
import { StatusChip } from "@/components/status-chip";
import { IconeVeiculo } from "@/components/icones";
import { Placa } from "@/components/placa";
import { mudarStatus } from "./actions";

export const metadata: Metadata = { title: "Agenda" };

export default function Agenda(props: PageProps<"/admin/agendamentos">) {
  return (
    <Suspense fallback={<Carregando />}>
      <Conteudo {...props} />
    </Suspense>
  );
}

type AgendamentoLista = Prisma.AgendamentoGetPayload<{
  include: { cliente: true; veiculo: true; itens: true };
}>;

async function Conteudo({ searchParams }: PageProps<"/admin/agendamentos">) {
  const { lojaId, loja } = await exigirAdmin();
  const params = await searchParams;
  const hoje = hojeISO();
  const data = typeof params.data === "string" && dataValida(params.data) ? params.data : hoje;
  const incluir = { cliente: true, veiculo: true, itens: true } as const;

  const [doDia, pendentes] = await Promise.all([
    prisma.agendamento.findMany({ where: { lojaId, data }, include: incluir, orderBy: { inicio: "asc" } }),
    prisma.agendamento.findMany({
      where: { lojaId, status: "PENDENTE", data: { gte: hoje } },
      include: incluir,
      orderBy: [{ data: "asc" }, { inicio: "asc" }],
    }),
  ]);

  const ativos = doDia.filter((a) => !["CANCELADO", "NAO_COMPARECEU"].includes(a.status));
  const previsto = ativos.reduce((t, a) => t + a.total - a.desconto, 0);

  return (
    <div className="space-y-6">
      <Cabecalho titulo="Agenda" descricao="Confirme, acompanhe e conclua os serviços do dia.">
        <Link href="/admin/agendamentos/novo" className="btn-primario">
          Novo agendamento
        </Link>
      </Cabecalho>

      {pendentes.length > 0 && (
        <Secao titulo={`Esperando confirmação (${pendentes.length})`} className="border-dourado/40">
          <ul className="divide-y divide-borda">
            {pendentes.map((a) => (
              <LinhaAgendamento key={a.id} a={a} nomeLoja={loja.nome} mostrarData />
            ))}
          </ul>
        </Secao>
      )}

      <section className="painel">
        <div className="flex flex-wrap items-center gap-2 border-b border-borda px-4 py-3">
          <Link href={`?data=${somarDias(data, -1)}`} className="btn-secundario px-3" aria-label="Dia anterior">
            ‹
          </Link>
          <Link href={`?data=${somarDias(data, 1)}`} className="btn-secundario px-3" aria-label="Próximo dia">
            ›
          </Link>
          {data !== hoje && (
            <Link href="?" className="btn-secundario">
              Hoje
            </Link>
          )}
          <form className="flex items-center gap-2">
            <input type="date" name="data" defaultValue={data} className="campo w-auto py-2" />
            <button className="btn-secundario">Ir</button>
          </form>
          <div className="ml-auto text-right">
            <p className="font-semibold first-letter:uppercase">
              {data === hoje ? "Hoje, " : ""}
              {formatarDataLonga(data)}
            </p>
            <p className="text-sm text-texto-suave">
              {ativos.length} {ativos.length === 1 ? "serviço" : "serviços"}, {formatarMoeda(previsto)} previstos
            </p>
          </div>
        </div>

        {doDia.length === 0 ? (
          <Vazio>Nenhum agendamento em {formatarData(data)}.</Vazio>
        ) : (
          <ul className="divide-y divide-borda">
            {doDia.map((a) => (
              <LinhaAgendamento key={a.id} a={a} nomeLoja={loja.nome} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function LinhaAgendamento({
  a,
  nomeLoja,
  mostrarData,
}: {
  a: AgendamentoLista;
  nomeLoja: string;
  mostrarData?: boolean;
}) {
  const primeiroNome = a.cliente.nome.split(" ")[0];
  const quando = `${formatarData(a.data).slice(0, 5)} às ${minutosParaHora(a.inicio)}`;
  const msgConfirmacao = `Olá, ${primeiroNome}! Seu horário na ${nomeLoja} está confirmado: ${quando} (${a.itens
    .map((i) => i.nomeServico)
    .join(" + ")}). Até lá!`;
  const msgPronto = `Olá, ${primeiroNome}! Seu ${a.veiculo.modelo} está pronto pra retirada aqui na ${nomeLoja}.`;
  const cancelado = a.status === "CANCELADO" || a.status === "NAO_COMPARECEU";

  return (
    <li className={`flex flex-col gap-3 px-4 py-3 md:flex-row md:items-center ${cancelado ? "opacity-55" : ""}`}>
      <div className="flex min-w-0 flex-1 items-start gap-4">
        <div className="w-14 shrink-0">
          {mostrarData && <p className="text-xs text-texto-suave">{formatarData(a.data).slice(0, 5)}</p>}
          <p className="text-lg font-bold leading-tight tabular-nums">{minutosParaHora(a.inicio)}</p>
          <p className="text-xs text-texto-suave tabular-nums">até {minutosParaHora(a.fim)}</p>
        </div>
        <div className="min-w-0 flex-1">
          <Link href={`/admin/agendamentos/${a.id}`} className="font-semibold hover:text-menta">
            {a.cliente.nome}
          </Link>
          <p className="text-sm text-texto">{a.itens.map((i) => i.nomeServico).join(" + ")}</p>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-texto-suave">
            <IconeVeiculo tipo={a.veiculo.tipo} className="h-4 w-8" />
            {a.veiculo.modelo} ({NOME_VEICULO[a.veiculo.tipo]})
            <Placa placa={a.veiculo.placa} pequena />
          </p>
          {a.observacoes && <p className="mt-1 text-sm italic text-texto-suave">“{a.observacoes}”</p>}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 md:justify-end">
        <span className="mr-1 font-semibold tabular-nums">{formatarMoeda(a.total - a.desconto)}</span>
        <StatusChip status={a.status} curto />
        {a.status === "PENDENTE" && (
          <>
            <form action={mudarStatus.bind(null, a.id, "CONFIRMADO")}>
              <button className="btn-primario py-1.5">Confirmar</button>
            </form>
            <a
              className="btn-secundario py-1.5"
              href={linkWhatsApp(a.cliente.telefone, msgConfirmacao)}
              target="_blank"
              rel="noreferrer"
              title={formatarTelefone(a.cliente.telefone)}
            >
              Avisar no WhatsApp
            </a>
          </>
        )}
        {a.status === "CONFIRMADO" && (
          <form action={mudarStatus.bind(null, a.id, "EM_ANDAMENTO")}>
            <button className="btn-primario py-1.5">Iniciar lavagem</button>
          </form>
        )}
        {a.status === "EM_ANDAMENTO" && (
          <>
            <Link href={`/admin/agendamentos/${a.id}#concluir`} className="btn-primario py-1.5">
              Concluir e receber
            </Link>
            <a
              className="btn-secundario py-1.5"
              href={linkWhatsApp(a.cliente.telefone, msgPronto)}
              target="_blank"
              rel="noreferrer"
            >
              Avisar que está pronto
            </a>
          </>
        )}
      </div>
    </li>
  );
}
