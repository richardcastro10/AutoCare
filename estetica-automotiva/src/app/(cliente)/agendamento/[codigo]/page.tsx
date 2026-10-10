import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { connection } from "next/server";
import { prisma } from "@/lib/prisma";
import { lojaPublicada } from "@/lib/catalogo";
import { clienteAtual } from "@/lib/dal";
import { NOME_VEICULO } from "@/lib/constantes";
import {
  agoraEmMinutos,
  formatarDataLonga,
  formatarMoeda,
  hojeISO,
  linkWhatsApp,
  minutosParaHora,
} from "@/lib/format";
import { IconeCalendario, IconeConversa, IconeLocal, IconeVeiculo } from "@/components/icones";
import { Placa } from "@/components/placa";
import { StatusChip } from "@/components/status-chip";
import { Estrelas } from "@/components/estrelas";
import { Topo } from "@/components/cliente/topo";
import { BotaoCancelar } from "./botao-cancelar";
import { FormAvaliacao } from "./form-avaliacao";

export const metadata: Metadata = { title: "Seu agendamento" };

export default function PaginaAgendamento(props: PageProps<"/agendamento/[codigo]">) {
  return (
    <>
      <Topo voltar="/meus-agendamentos" titulo="Seu agendamento" />
      <Suspense fallback={<div className="mx-4 h-96 animate-pulse rounded-xl bg-superficie" />}>
        <Detalhes {...props} />
      </Suspense>
    </>
  );
}

async function Detalhes({ params, searchParams }: PageProps<"/agendamento/[codigo]">) {
  await connection(); // dados ao vivo: sempre consulta o banco na hora
  const { codigo } = await params;
  const { novo } = await searchParams;

  const a = await prisma.agendamento.findUnique({
    where: { codigo },
    include: {
      itens: true,
      veiculo: true,
      avaliacao: true,
      loja: {
        select: {
          nome: true,
          slug: true,
          telefone: true,
          endereco: true,
          bairro: true,
          cidade: true,
          uf: true,
          status: true,
          ativa: true,
        },
      },
    },
  });
  if (!a) notFound();

  // qualquer um com o link vê; cancelar e avaliar é só do dono logado (agendamento do app)
  const cliente = await clienteAtual();
  const dono = !!cliente && !cliente.senhaTemporaria && cliente.id === a.clienteId && a.origem === "APP";

  const hoje = hojeISO();
  const jaPassou = a.data < hoje || (a.data === hoje && a.inicio <= agoraEmMinutos());
  const podeCancelar = ["PENDENTE", "CONFIRMADO"].includes(a.status) && !jaPassou;
  const ativo = ["PENDENTE", "CONFIRMADO", "EM_ANDAMENTO"].includes(a.status);
  // loja suspensa (ou fora do ar): o agendamento continua como está, mas avisamos o cliente
  const lojaNoAr = lojaPublicada(a.loja);

  const nomesServicos = a.itens.map((i) => i.nomeServico).join(" + ");
  const dataLonga = formatarDataLonga(a.data);
  const endereco = `${a.loja.endereco}, ${a.loja.bairro}, ${a.loja.cidade} - ${a.loja.uf}`;
  const mensagem = `Olá! Sobre meu agendamento ${a.codigo} (${dataLonga} às ${minutosParaHora(a.inicio)}).`;

  return (
    <main className="flex-1 space-y-4 px-4 pb-8">
      {novo && a.status === "PENDENTE" && (
        <div className="rounded-xl border border-menta/40 bg-menta/10 p-4">
          <p className="titulo text-lg text-menta">Horário reservado!</p>
          <p className="mt-1 text-sm text-texto-suave">
            A {a.loja.nome} vai confirmar pelo WhatsApp. Este link fica em “Meus horários”.
          </p>
        </div>
      )}

      {!lojaNoAr && (
        <p role="status" className="rounded-xl border border-dourado/40 bg-dourado/10 p-4 text-sm text-dourado">
          Esta loja está indisponível no momento. Fale com ela pelo WhatsApp.
        </p>
      )}

      <article className="painel overflow-hidden">
        <div className="border-b border-dashed border-borda p-4">
          <div className="flex items-center justify-between gap-3">
            <Link href={`/loja/${a.loja.slug}`} className="text-sm font-medium text-menta">
              {a.loja.nome}
            </Link>
            <StatusChip status={a.status} />
          </div>
          <p className="mt-3 text-[2.2rem] font-semibold leading-none tabular-nums">{minutosParaHora(a.inicio)}</p>
          <p className="mt-1.5 font-medium first-letter:uppercase">{dataLonga}</p>
          <p className="text-sm text-texto-suave">
            Previsão de entrega às {minutosParaHora(a.fim)}. Código {a.codigo}
          </p>
        </div>

        <div className="flex items-center gap-3 border-b border-dashed border-borda p-4">
          <IconeVeiculo tipo={a.veiculo.tipo} className="h-6 w-12 text-texto" />
          <div className="flex-1">
            <p className="font-medium">{a.veiculo.modelo}</p>
            <p className="text-sm text-texto-suave">{NOME_VEICULO[a.veiculo.tipo]}</p>
          </div>
          <Placa placa={a.veiculo.placa} pequena />
        </div>

        <ul className="p-4 text-sm">
          {a.itens.map((item) => (
            <li key={item.id} className="flex justify-between py-0.5">
              <span>{item.nomeServico}</span>
              <span className="tabular-nums">{formatarMoeda(item.preco)}</span>
            </li>
          ))}
          {a.desconto > 0 && (
            <li className="flex justify-between py-0.5 text-menta">
              <span>Desconto</span>
              <span className="tabular-nums">-{formatarMoeda(a.desconto)}</span>
            </li>
          )}
          <li className="mt-2 flex justify-between border-t border-borda pt-2 font-semibold">
            <span>Total</span>
            <span className="tabular-nums text-menta">{formatarMoeda(a.total - a.desconto)}</span>
          </li>
        </ul>
      </article>

      {a.status === "CONCLUIDO" &&
        dono &&
        (a.avaliacao ? (
          <div className="painel p-4">
            <p className="text-sm text-texto-suave">Sua avaliação</p>
            <Estrelas nota={a.avaliacao.nota} className="mt-1 size-5" />
            {a.avaliacao.comentario && <p className="mt-1.5 text-sm">{a.avaliacao.comentario}</p>}
          </div>
        ) : (
          <FormAvaliacao codigo={a.codigo} loja={a.loja.nome} />
        ))}

      {ativo && (
        <div className="grid grid-cols-2 gap-2">
          {lojaNoAr && (
            <a
              className="btn-secundario"
              target="_blank"
              rel="noreferrer"
              href={linkAgendaGoogle({
                titulo: `${nomesServicos} - ${a.loja.nome}`,
                data: a.data,
                inicio: a.inicio,
                fim: a.fim,
                local: endereco,
              })}
            >
              <IconeCalendario className="size-4" />
              Pôr na agenda
            </a>
          )}
          {a.loja.telefone && (
            <a
              className={`btn-secundario ${lojaNoAr ? "" : "col-span-2"}`}
              target="_blank"
              rel="noreferrer"
              href={linkWhatsApp(a.loja.telefone, mensagem)}
            >
              <IconeConversa className="size-4" />
              Falar com a loja
            </a>
          )}
          <a
            className="btn-secundario col-span-2"
            target="_blank"
            rel="noreferrer"
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(endereco)}`}
          >
            <IconeLocal className="size-4" />
            Como chegar
          </a>
        </div>
      )}

      {podeCancelar && dono && <BotaoCancelar codigo={a.codigo} />}

      {!dono && a.origem === "APP" && (podeCancelar || (a.status === "CONCLUIDO" && !a.avaliacao)) && (
        <p className="painel p-4 text-sm text-texto-suave">
          Pra {podeCancelar ? "cancelar" : "avaliar"},{" "}
          <Link
            href={`/conta/entrar?voltar=${encodeURIComponent(`/agendamento/${a.codigo}`)}`}
            className="font-medium text-menta"
          >
            entre com a conta
          </Link>{" "}
          que fez este agendamento.
        </p>
      )}

      {lojaNoAr && (
        <Link href={`/loja/${a.loja.slug}`} className="block py-2 text-center text-sm font-medium text-menta">
          Agendar outro serviço na {a.loja.nome}
        </Link>
      )}
    </main>
  );
}

function linkAgendaGoogle(e: { titulo: string; data: string; inicio: number; fim: number; local: string }) {
  const formato = (min: number) => `${e.data.replaceAll("-", "")}T${minutosParaHora(min).replace(":", "")}00`;
  const url = new URL("https://calendar.google.com/calendar/render");
  url.searchParams.set("action", "TEMPLATE");
  url.searchParams.set("text", e.titulo);
  url.searchParams.set("dates", `${formato(e.inicio)}/${formato(e.fim)}`);
  url.searchParams.set("ctz", "America/Sao_Paulo");
  url.searchParams.set("location", e.local);
  return url.toString();
}
