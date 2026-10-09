"use client";

// Dados guardados no aparelho do cliente (localStorage): localização e lojas favoritas.
// useSyncExternalStore lê o localStorage sem precisar de useEffect + setState,
// e todos os componentes que usam a mesma chave se atualizam juntos.
import { useCallback, useMemo, useState, useSyncExternalStore } from "react";

const EVENTO = "autocare:guardado";

function lerTexto(chave: string) {
  try {
    return localStorage.getItem(chave);
  } catch {
    return null; // aba anônima, bloqueado etc.
  }
}

function gravar(chave: string, valor: unknown) {
  try {
    localStorage.setItem(chave, JSON.stringify(valor));
  } catch {
    // sem localStorage: segue sem guardar
  }
  window.dispatchEvent(new Event(EVENTO));
}

function assinar(avisar: () => void) {
  window.addEventListener("storage", avisar);
  window.addEventListener(EVENTO, avisar);
  return () => {
    window.removeEventListener("storage", avisar);
    window.removeEventListener(EVENTO, avisar);
  };
}

function useGuardado<T>(chave: string): T | null {
  // o snapshot é o texto bruto (string é comparável); o parse fica no useMemo
  const texto = useSyncExternalStore(
    assinar,
    () => lerTexto(chave),
    () => null, // no servidor não existe localStorage
  );
  return useMemo(() => {
    if (!texto) return null;
    try {
      return JSON.parse(texto) as T;
    } catch {
      return null;
    }
  }, [texto]);
}

export type Coordenadas = { lat: number; lng: number };

export function useLocalizacao() {
  const coords = useGuardado<Coordenadas>("autocare:posicao");
  const [estado, setEstado] = useState<"parado" | "buscando" | "erro">("parado");

  const pedir = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setEstado("erro");
      return;
    }
    setEstado("buscando");
    navigator.geolocation.getCurrentPosition(
      (posicao) => {
        gravar("autocare:posicao", { lat: posicao.coords.latitude, lng: posicao.coords.longitude });
        setEstado("parado");
      },
      () => setEstado("erro"),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 10 * 60 * 1000 },
    );
  }, []);

  return { coords, pedir, buscando: estado === "buscando", erro: estado === "erro" };
}

export function useFavoritos() {
  const favoritos = useGuardado<string[]>("autocare:favoritos") ?? [];
  const alternar = (slug: string) =>
    gravar(
      "autocare:favoritos",
      favoritos.includes(slug) ? favoritos.filter((s) => s !== slug) : [...favoritos, slug],
    );
  return { favoritos, alternar };
}
