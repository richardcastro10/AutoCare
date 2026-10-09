"use client";

import Link from "next/link";
import { useState } from "react";
import type { LojaResumo } from "@/lib/catalogo";
import { distanciaKm, formatarDistancia, formatarMoeda, normalizar } from "@/lib/format";
import { useFavoritos, useLocalizacao } from "@/components/cliente/guardado";
import { IconeBusca, IconeCoracao, IconeLocal, IconeMira } from "@/components/icones";
import { NotaLoja } from "@/components/estrelas";
import { Foto } from "@/components/foto";

const QTD_INICIAL = 3;

export function BuscaLojas({ lojas }: { lojas: LojaResumo[] }) {
  const [busca, setBusca] = useState("");
  const [verTodas, setVerTodas] = useState(false);
  const { coords, pedir, buscando, erro } = useLocalizacao();
  const { favoritos } = useFavoritos();

  const termo = normalizar(busca.trim());
  const lista = lojas
    .filter(
      (l) =>
        !termo ||
        [l.nome, l.bairro, l.cidade, ...l.servicos].some((texto) => normalizar(texto).includes(termo)),
    )
    .map((l) => ({
      ...l,
      distancia:
        coords && l.latitude !== null && l.longitude !== null
          ? distanciaKm(coords.lat, coords.lng, l.latitude, l.longitude)
          : null,
      favorita: favoritos.includes(l.slug),
    }))
    // favoritas primeiro; depois a mais perto (ou a mais bem avaliada, sem localização)
    .sort(
      (a, b) =>
        Number(b.favorita) - Number(a.favorita) ||
        (a.distancia ?? 0) - (b.distancia ?? 0) ||
        (b.nota ?? 0) - (a.nota ?? 0),
    );

  const visiveis = verTodas || termo ? lista : lista.slice(0, QTD_INICIAL);

  return (
    <div>
      <label className="relative block">
        <span className="sr-only">Buscar loja</span>
        <IconeBusca className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-texto-suave" />
        <input
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome, cidade ou bairro"
          className="campo rounded-xl py-3.5 pl-11"
        />
      </label>

      <button
        type="button"
        onClick={pedir}
        disabled={buscando}
        className="mt-3 flex items-center gap-2.5 text-sm font-medium text-menta disabled:opacity-60"
      >
        <span className="grid size-8 place-items-center rounded-full border border-menta/50">
          <IconeMira className="size-4" />
        </span>
        {buscando ? "Buscando sua localização..." : coords ? "Atualizar minha localização" : "Usar minha localização"}
      </button>
      {erro && (
        <p className="mt-1 text-xs text-texto-suave">
          Não deu pra pegar sua localização. Libere o acesso no navegador ou busque pelo nome da cidade.
        </p>
      )}

      <div className="mt-7 flex items-baseline justify-between">
        <h2 className="font-semibold">{termo ? `Resultados (${lista.length})` : coords ? "Lojas próximas" : "Lojas"}</h2>
        {!termo && lista.length > QTD_INICIAL && (
          <button type="button" onClick={() => setVerTodas(!verTodas)} className="text-sm font-medium text-menta">
            {verTodas ? "Ver menos" : "Ver todas"}
          </button>
        )}
      </div>

      {lista.length === 0 ? (
        <p className="painel mt-3 p-4 text-sm text-texto-suave">
          Nenhuma loja encontrada pra “{busca}”. Tente o nome da cidade ou do bairro.
        </p>
      ) : (
        <ul className="mt-3 space-y-3">
          {visiveis.map((l) => (
            <li key={l.id}>
              <Link href={`/loja/${l.slug}`} className="painel flex gap-3 p-3 transition-colors hover:border-menta/50">
                <Foto src={l.capaUrl} alt={l.nome} className="h-[4.5rem] w-24 shrink-0 rounded-lg" />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 font-semibold">
                    <span className="truncate">{l.nome}</span>
                    {l.favorita && <IconeCoracao cheio className="size-3.5 shrink-0 text-perigo" />}
                  </p>
                  <NotaLoja nota={l.nota} total={l.totalAvaliacoes} curto />
                  <div className="mt-1 flex items-center justify-between gap-2 text-sm text-texto-suave">
                    <span className="truncate">
                      {l.cidade} - {l.uf}
                    </span>
                    {l.distancia !== null ? (
                      <span className="flex shrink-0 items-center gap-1">
                        <IconeLocal className="size-3.5" />
                        {formatarDistancia(l.distancia)}
                      </span>
                    ) : (
                      l.precoMinimo !== null && (
                        <span className="shrink-0 text-xs">a partir de {formatarMoeda(l.precoMinimo)}</span>
                      )
                    )}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
