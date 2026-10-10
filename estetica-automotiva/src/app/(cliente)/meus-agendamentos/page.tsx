import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { exigirCliente } from "@/lib/dal";
import { formatarDataLonga, formatarMoeda, hojeISO, minutosParaHora } from "@/lib/format";
import { IconeSeta, IconeVeiculo } from "@/components/icones";
import { StatusChip } from "@/components/status-chip";
import { NavCliente } from "@/components/cliente/nav";

export const metadata: Metadata = { title: "Meus horários" };

export default function MeusAgendamentos() {
  return (
    <>
      <main className="flex-1 px-4 pb-6 pt-[max(1.25rem,env(safe-area-inset-top))]">
        <h1 className="titulo text-2xl">Meus horários</h1>
        <Suspense fallback={<div className="mt-4 h-40 animate-pulse rounded-xl bg-superficie" />}>
          <Lista />
        </Suspense>
      </main>
      <NavCliente ativo="horarios" />
    </>
  );
}

async function Lista() {
  const cliente = await exigirCliente("/meus-agendamentos");

  // Só o que o cliente agendou pelo app com a conta. Se o celular já era de balcão,
  // os agendamentos feitos na loja (origem BALCAO) continuam só no painel da loja.
  const agendamentos = await prisma.agendamento.findMany({
    where: { clienteId: cliente.id, origem: "APP" },
    include: { itens: { select: { nomeServico: true } }, veiculo: true, loja: { select: { nome: true } } },
    orderBy: [{ data: "desc" }, { inicio: "desc" }],
    take: 40,
  });

  const hoje = hojeISO();
  const proximos = agendamentos
    .filter((a) => a.data >= hoje && ["PENDENTE", "CONFIRMADO", "EM_ANDAMENTO"].includes(a.status))
    .reverse();
  const historico = agendamentos.filter((a) => !proximos.includes(a));

  return (
    <div className="mt-5 space-y-6">
      <section>
        <h2 className="mb-2 text-sm font-medium text-texto-suave">Próximos</h2>
        {proximos.length === 0 ? (
          <div className="painel p-4 text-sm">
            Nada marcado.{" "}
            <Link href="/" className="font-medium text-menta">
              Agendar agora
            </Link>
          </div>
        ) : (
          <ul className="space-y-2.5">
            {proximos.map((a) => (
              <Item key={a.id} a={a} />
            ))}
          </ul>
        )}
      </section>

      {historico.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-medium text-texto-suave">Histórico</h2>
          <ul className="space-y-2.5">
            {historico.map((a) => (
              <Item key={a.id} a={a} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

type ItemProps = {
  a: Prisma.AgendamentoGetPayload<{
    include: { itens: { select: { nomeServico: true } }; veiculo: true; loja: { select: { nome: true } } };
  }>;
};

function Item({ a }: ItemProps) {
  return (
    <li>
      <Link href={`/agendamento/${a.codigo}`} className="painel flex items-center gap-3 p-3.5 hover:border-menta/50">
        <IconeVeiculo tipo={a.veiculo.tipo} className="h-6 w-11 shrink-0 text-texto-suave" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs text-menta">{a.loja.nome}</p>
          <p className="font-medium">{a.itens.map((i) => i.nomeServico).join(" + ")}</p>
          <p className="text-sm text-texto-suave first-letter:uppercase">
            {formatarDataLonga(a.data)} às {minutosParaHora(a.inicio)}
          </p>
          <div className="mt-2 flex items-center justify-between gap-2">
            <StatusChip status={a.status} curto />
            <span className="text-sm font-medium tabular-nums">{formatarMoeda(a.total - a.desconto)}</span>
          </div>
        </div>
        <IconeSeta className="size-4 shrink-0 text-texto-suave" />
      </Link>
    </li>
  );
}
