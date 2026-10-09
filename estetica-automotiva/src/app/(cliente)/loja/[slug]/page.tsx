import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getAvaliacoes, getLojaPorSlug, type LojaCompleta } from "@/lib/catalogo";
import { getLojaNoApp } from "@/lib/dal";
import { DIAS_SEMANA } from "@/lib/constantes";
import {
  formatarDuracao,
  formatarMoeda,
  formatarTelefone,
  linkWhatsApp,
  minutosParaHora,
  resumoHorario,
} from "@/lib/format";
import { IconeConversa, IconeLocal, IconeRelogio, IconeSeta, IconeVoltarSeta } from "@/components/icones";
import { Foto } from "@/components/foto";
import { LogoLoja } from "@/components/marca";
import { Estrelas, NotaLoja } from "@/components/estrelas";
import { FaixaPrevia, LojaIndisponivel } from "@/components/cliente/previa";
import { Abas } from "./abas";
import { BotaoFavorito, Distancia } from "./interativos";

export async function generateMetadata({ params }: PageProps<"/loja/[slug]">): Promise<Metadata> {
  const loja = await getLojaPorSlug((await params).slug);
  return { title: loja?.nome ?? "Loja" };
}

// Tela 02 do design: página da loja
export default function PaginaLoja(props: PageProps<"/loja/[slug]">) {
  return (
    <Suspense fallback={<div className="h-64 animate-pulse bg-superficie" />}>
      <Conteudo {...props} />
    </Suspense>
  );
}

async function Conteudo({ params }: PageProps<"/loja/[slug]">) {
  const { slug } = await params;
  // loja fora do ar (pendente, suspensa ou desligada): o cliente vê o aviso;
  // o dono da plataforma e a equipe da própria loja veem a prévia
  const resultado = await getLojaNoApp(slug);
  if (!resultado) notFound();
  if (resultado.situacao === "indisponivel") return <LojaIndisponivel />;
  const { loja, previa } = resultado;

  const avaliacoes = await getAvaliacoes(loja.id);
  const horario = resumoHorario(loja.horarios);
  const mapa = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${loja.endereco}, ${loja.bairro}, ${loja.cidade} - ${loja.uf}`,
  )}`;

  return (
    <>
      {previa && <FaixaPrevia />}
      {/* Capa */}
      <div className="relative h-56">
        {loja.capaUrl ? (
          <Foto src={loja.capaUrl} alt={`Fachada da ${loja.nome}`} className="size-full" />
        ) : (
          <div className="grid size-full place-items-center bg-[radial-gradient(ellipse_at_50%_40%,#1d3443,#0b1720_75%)]">
            <LogoLoja nome={loja.nome} logoUrl={loja.logoUrl} tamanho="lg" />
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-fundo to-transparent" />
        <div className="absolute inset-x-0 top-0 flex justify-between px-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <Link href="/" aria-label="Voltar" className="grid size-10 place-items-center rounded-full bg-fundo/60 backdrop-blur">
            <IconeVoltarSeta className="size-5" />
          </Link>
          <BotaoFavorito slug={loja.slug} />
        </div>
      </div>

      <main className="flex-1 px-4 pb-8">
        <h1 className="titulo text-xl">{loja.nome}</h1>
        <div className="mt-1">
          <NotaLoja nota={loja.nota} total={loja.totalAvaliacoes} />
        </div>

        <div className="mt-4 grid grid-cols-3 divide-x divide-borda text-center text-xs text-texto-suave">
          <div className="flex flex-col items-center gap-1 px-1">
            <IconeRelogio className="size-5 text-texto" />
            <span className="text-texto">{horario.horas}</span>
            <span>{horario.dias}</span>
          </div>
          <a href={mapa} target="_blank" rel="noreferrer" className="flex flex-col items-center gap-1 px-1">
            <IconeLocal className="size-5 text-texto" />
            <span className="text-texto">
              {loja.cidade} - {loja.uf}
            </span>
            <span className="underline-offset-2 hover:underline">Ver endereço</span>
          </a>
          <Distancia latitude={loja.latitude} longitude={loja.longitude} telefone={loja.telefone} />
        </div>

        <Abas
          servicos={<ListaServicos loja={loja} />}
          avaliacoes={<ListaAvaliacoes loja={loja} dados={avaliacoes} />}
          sobre={<Sobre loja={loja} mapa={mapa} />}
        />
      </main>
    </>
  );
}

function ListaServicos({ loja }: { loja: LojaCompleta }) {
  if (!loja.servicos.length) {
    return <p className="py-6 text-center text-sm text-texto-suave">Essa loja ainda não cadastrou serviços.</p>;
  }
  return (
    <ul className="space-y-3">
      {loja.servicos.map((s) => {
        const precos = Object.values(s.precos);
        const minimo = Math.min(...precos);
        const variaPreco = precos.some((p) => p !== minimo);
        return (
          <li key={s.id}>
            <Link
              href={`/loja/${loja.slug}/servico/${s.id}`}
              className="painel flex items-center gap-3 p-2.5 pr-3 transition-colors hover:border-menta/50"
            >
              <Foto src={s.imagemUrl} alt={s.nome} className="h-[4.25rem] w-[5.5rem] shrink-0 rounded-lg" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{s.nome}</p>
                <p className="truncate text-xs text-texto-suave">{s.resumo}</p>
                <p className="mt-1 flex items-center gap-1 text-xs text-texto-suave">
                  <IconeRelogio className="size-3.5" />
                  {formatarDuracao(s.duracaoMin)}
                </p>
              </div>
              <div className="text-right">
                {variaPreco && <p className="text-[11px] text-texto-suave">a partir de</p>}
                <p className="text-sm font-semibold tabular-nums">{formatarMoeda(minimo)}</p>
              </div>
              <IconeSeta className="size-4 shrink-0 text-texto-suave" />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function ListaAvaliacoes({
  loja,
  dados,
}: {
  loja: LojaCompleta;
  dados: Awaited<ReturnType<typeof getAvaliacoes>>;
}) {
  if (!loja.totalAvaliacoes || !loja.nota) {
    return (
      <p className="py-6 text-center text-sm text-texto-suave">
        Ainda sem avaliações. Depois do serviço, você pode avaliar pela tela do seu agendamento.
      </p>
    );
  }
  const maior = Math.max(...dados.porNota.map((p) => p.quantidade), 1);
  return (
    <div>
      <div className="painel flex items-center gap-5 p-4">
        <div className="text-center">
          <p className="text-4xl font-semibold tabular-nums">{loja.nota.toFixed(1).replace(".", ",")}</p>
          <Estrelas nota={loja.nota} />
          <p className="mt-1 text-xs text-texto-suave">{loja.totalAvaliacoes} avaliações</p>
        </div>
        <ul className="flex-1 space-y-1">
          {dados.porNota.map((p) => (
            <li key={p.nota} className="flex items-center gap-2 text-xs text-texto-suave">
              <span className="w-2 tabular-nums">{p.nota}</span>
              <span className="h-1.5 flex-1 rounded-full bg-superficie-2">
                <span
                  className="block h-1.5 rounded-full bg-dourado"
                  style={{ width: `${(p.quantidade / maior) * 100}%` }}
                />
              </span>
              <span className="w-6 text-right tabular-nums">{p.quantidade}</span>
            </li>
          ))}
        </ul>
      </div>

      <ul className="mt-4 divide-y divide-borda">
        {dados.lista.map((a) => (
          <li key={a.id} className="py-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium">{a.autor}</span>
              <span className="text-xs text-texto-suave">
                {new Date(a.data).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}
              </span>
            </div>
            <div className="mt-0.5 flex items-center gap-2">
              <Estrelas nota={a.nota} className="size-3.5" />
              <span className="truncate text-xs text-texto-suave">{a.servico}</span>
            </div>
            {a.comentario && <p className="mt-1.5 text-sm text-texto">{a.comentario}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Sobre({ loja, mapa }: { loja: LojaCompleta; mapa: string }) {
  const ordem = [1, 2, 3, 4, 5, 6, 0];
  return (
    <div className="space-y-5">
      {loja.descricao && <p className="text-sm leading-relaxed text-texto-suave">{loja.descricao}</p>}

      <div>
        <h3 className="mb-2 text-sm font-semibold">Horário de funcionamento</h3>
        <ul className="painel divide-y divide-borda">
          {ordem.map((dia) => {
            const h = loja.horarios[dia];
            return (
              <li key={dia} className="flex justify-between px-4 py-2.5 text-sm">
                <span>{DIAS_SEMANA[dia]}</span>
                <span className={h.aberto ? "tabular-nums" : "text-texto-fraco"}>
                  {h.aberto ? `${minutosParaHora(h.abre)} às ${minutosParaHora(h.fecha)}` : "Fechado"}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold">Endereço</h3>
        <p className="text-sm text-texto-suave">
          {loja.endereco}, {loja.bairro}
          <br />
          {loja.cidade} - {loja.uf}
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <a href={mapa} target="_blank" rel="noreferrer" className="btn-secundario">
            <IconeLocal className="size-4" />
            Como chegar
          </a>
          {loja.telefone && (
            <a href={linkWhatsApp(loja.telefone)} target="_blank" rel="noreferrer" className="btn-secundario">
              <IconeConversa className="size-4" />
              {formatarTelefone(loja.telefone)}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
