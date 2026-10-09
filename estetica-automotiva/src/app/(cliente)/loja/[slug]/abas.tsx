"use client";

import { useState, type ReactNode } from "react";

// O conteúdo das três abas é renderizado no servidor e chega pronto aqui;
// este componente só decide qual mostrar.
const ABAS = [
  { chave: "servicos", rotulo: "Serviços" },
  { chave: "avaliacoes", rotulo: "Avaliações" },
  { chave: "sobre", rotulo: "Sobre" },
] as const;

type Chave = (typeof ABAS)[number]["chave"];

export function Abas(conteudo: Record<Chave, ReactNode>) {
  const [ativa, setAtiva] = useState<Chave>("servicos");

  return (
    <div className="mt-5">
      <div role="tablist" className="grid grid-cols-3 border-b border-borda">
        {ABAS.map((aba) => (
          <button
            key={aba.chave}
            role="tab"
            id={`aba-${aba.chave}`}
            aria-selected={ativa === aba.chave}
            aria-controls={`painel-${aba.chave}`}
            onClick={() => setAtiva(aba.chave)}
            className={`-mb-px border-b-2 py-3 text-sm font-medium transition-colors ${
              ativa === aba.chave ? "border-menta text-menta" : "border-transparent text-texto-suave hover:text-texto"
            }`}
          >
            {aba.rotulo}
          </button>
        ))}
      </div>
      {ABAS.map((aba) => (
        <div
          key={aba.chave}
          role="tabpanel"
          id={`painel-${aba.chave}`}
          aria-labelledby={`aba-${aba.chave}`}
          hidden={ativa !== aba.chave}
          className="pt-4"
        >
          {conteudo[aba.chave]}
        </div>
      ))}
    </div>
  );
}
