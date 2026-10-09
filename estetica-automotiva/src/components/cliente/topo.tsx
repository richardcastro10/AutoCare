import Link from "next/link";
import type { ReactNode } from "react";
import { IconeVoltarSeta } from "../icones";

/** Topo das telas do fluxo: seta de voltar + título */
export function Topo({ voltar, titulo, direita }: { voltar: string; titulo: string; direita?: ReactNode }) {
  return (
    <header className="sticky top-0 z-20 flex items-center gap-3 bg-fundo/90 px-4 pb-3 pt-[max(0.9rem,env(safe-area-inset-top))] backdrop-blur">
      <Link href={voltar} className="-ml-1.5 grid size-9 place-items-center rounded-lg hover:bg-superficie-2" aria-label="Voltar">
        <IconeVoltarSeta className="size-5" />
      </Link>
      <h1 className="titulo flex-1 truncate text-lg">{titulo}</h1>
      {direita}
    </header>
  );
}

/** Área fixa no rodapé com o botão principal da tela */
export function Rodape({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-0 z-20 mt-auto bg-gradient-to-t from-fundo via-fundo to-fundo/0 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-6">
      {children}
    </div>
  );
}
