"use client";

import { distanciaKm, formatarDistancia, linkWhatsApp } from "@/lib/format";
import { useFavoritos, useLocalizacao } from "@/components/cliente/guardado";
import { IconeConversa, IconeCoracao, IconeMira } from "@/components/icones";

export function BotaoFavorito({ slug }: { slug: string }) {
  const { favoritos, alternar } = useFavoritos();
  const favorita = favoritos.includes(slug);
  return (
    <button
      type="button"
      onClick={() => alternar(slug)}
      aria-pressed={favorita}
      aria-label={favorita ? "Tirar dos favoritos" : "Salvar nos favoritos"}
      className="grid size-10 place-items-center rounded-full bg-fundo/60 backdrop-blur"
    >
      <IconeCoracao cheio={favorita} className={`size-5 ${favorita ? "text-perigo" : ""}`} />
    </button>
  );
}

/** Terceira coluna da loja: distância (se o cliente liberou a localização) ou WhatsApp */
export function Distancia({
  latitude,
  longitude,
  telefone,
}: {
  latitude: number | null;
  longitude: number | null;
  telefone: string;
}) {
  const { coords, pedir, buscando } = useLocalizacao();

  if (coords && latitude !== null && longitude !== null) {
    return (
      <div className="flex flex-col items-center gap-1 px-1">
        <IconeMira className="size-5 text-texto" />
        <span className="text-texto">{formatarDistancia(distanciaKm(coords.lat, coords.lng, latitude, longitude))}</span>
        <span>de você</span>
      </div>
    );
  }
  if (latitude !== null && longitude !== null) {
    return (
      <button type="button" onClick={pedir} className="flex flex-col items-center gap-1 px-1">
        <IconeMira className="size-5 text-texto" />
        <span className="text-texto">{buscando ? "Buscando..." : "Distância"}</span>
        <span className="underline-offset-2 hover:underline">Ver de mim</span>
      </button>
    );
  }
  return (
    <a href={linkWhatsApp(telefone)} target="_blank" rel="noreferrer" className="flex flex-col items-center gap-1 px-1">
      <IconeConversa className="size-5 text-texto" />
      <span className="text-texto">WhatsApp</span>
      <span>Falar com a loja</span>
    </a>
  );
}
