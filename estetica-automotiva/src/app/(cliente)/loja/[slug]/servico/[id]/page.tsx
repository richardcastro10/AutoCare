import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { getLojaNoApp } from "@/lib/dal";
import { NOME_VEICULO, TIPOS_VEICULO } from "@/lib/constantes";
import { formatarDuracao, formatarMoeda } from "@/lib/format";
import { IconeCheck, IconeRelogio, IconeVeiculo } from "@/components/icones";
import { Foto } from "@/components/foto";
import { Rodape, Topo } from "@/components/cliente/topo";
import { FaixaPrevia } from "@/components/cliente/previa";
import { MaisDetalhes } from "./mais-detalhes";

export const metadata: Metadata = { title: "Serviço" };

const PLURAL = { MOTO: "motos", CARRO: "carros", SUV: "SUVs", CAMINHONETE: "picapes" } as const;

// Tela 03 do design: detalhes do serviço
export default function PaginaServico(props: PageProps<"/loja/[slug]/servico/[id]">) {
  return (
    <Suspense fallback={<div className="h-64 animate-pulse bg-superficie" />}>
      <Conteudo {...props} />
    </Suspense>
  );
}

async function Conteudo({ params }: PageProps<"/loja/[slug]/servico/[id]">) {
  const { slug, id } = await params;
  const resultado = await getLojaNoApp(slug);
  if (!resultado) notFound();
  // loja fora do ar: a página da loja é que mostra o aviso
  if (resultado.situacao === "indisponivel") redirect(`/loja/${slug}`);
  const { loja, previa } = resultado;
  const servico = loja.servicos.find((s) => s.id === Number(id));
  if (!servico) notFound();

  const tipos = TIPOS_VEICULO.filter((t) => servico.precos[t] !== undefined);
  const precos = tipos.map((t) => servico.precos[t]!);
  const minimo = Math.min(...precos);
  const atende = tipos.map((t) => PLURAL[t]);
  // ["carros", "SUVs", "picapes"] -> "Carros, SUVs e picapes"
  const textoAtende = atende.length > 1 ? `${atende.slice(0, -1).join(", ")} e ${atende.at(-1)}` : atende[0] ?? "";

  return (
    <>
      {previa && <FaixaPrevia />}
      <Topo voltar={`/loja/${loja.slug}`} titulo={servico.nome} />

      <main className="flex-1 px-4">
        <Foto src={servico.imagemUrl} alt={servico.nome} className="aspect-[16/10] w-full rounded-xl" />

        <div className="mt-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="titulo text-lg">{servico.nome}</h2>
            <p className="text-sm text-texto-suave">{servico.resumo}</p>
          </div>
          <div className="text-right">
            {precos.some((p) => p !== minimo) && <p className="text-[11px] text-texto-suave">a partir de</p>}
            <p className="text-lg font-semibold tabular-nums">{formatarMoeda(minimo)}</p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 border-b border-borda pb-4 text-sm text-texto-suave">
          <span className="flex items-center gap-1.5">
            <IconeRelogio className="size-4" />
            {formatarDuracao(servico.duracaoMin)}
          </span>
          <span className="flex items-center gap-1.5">
            <IconeVeiculo tipo="CARRO" className="h-4 w-7" />
            {textoAtende.charAt(0).toUpperCase() + textoAtende.slice(1)}
          </span>
        </div>

        {servico.inclusos.length > 0 && (
          <section className="mt-4">
            <h3 className="font-semibold">O que está incluso</h3>
            <ul className="mt-3 space-y-2.5">
              {servico.inclusos.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-texto-suave">
                  <IconeCheck className="mt-0.5 size-4 shrink-0 text-menta" />
                  {item}
                </li>
              ))}
            </ul>
          </section>
        )}

        <MaisDetalhes>
          <h3 className="mb-2 text-sm font-semibold">Preço por tipo de veículo</h3>
          <ul className="painel divide-y divide-borda">
            {tipos.map((t) => (
              <li key={t} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                <IconeVeiculo tipo={t} className="h-4 w-8 text-texto-suave" />
                <span className="flex-1">{NOME_VEICULO[t]}</span>
                <span className="font-medium tabular-nums">{formatarMoeda(servico.precos[t]!)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-texto-suave">Pagamento na loja, depois do serviço: Pix, cartão ou dinheiro.</p>
        </MaisDetalhes>
      </main>

      <Rodape>
        {previa ? (
          // na prévia não dá pra agendar (o servidor também recusa)
          <button className="btn-cta" disabled>
            Agendamento indisponível na prévia
          </button>
        ) : (
          <Link href={`/loja/${loja.slug}/agendar?servico=${servico.id}`} className="btn-cta">
            Selecionar este serviço
          </Link>
        )}
      </Rodape>
    </>
  );
}
