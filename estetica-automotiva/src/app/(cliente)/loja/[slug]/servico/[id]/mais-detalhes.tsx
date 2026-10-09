"use client";

import { useState, type ReactNode } from "react";
import { IconeBaixo } from "@/components/icones";

export function MaisDetalhes({ children }: { children: ReactNode }) {
  const [aberto, setAberto] = useState(false);
  return (
    <div className="mt-4 pb-4">
      <button
        type="button"
        onClick={() => setAberto(!aberto)}
        aria-expanded={aberto}
        className="flex items-center gap-1 text-sm font-medium text-menta"
      >
        {aberto ? "Ver menos" : "Ver mais detalhes"}
        <IconeBaixo className={`size-4 transition-transform ${aberto ? "rotate-180" : ""}`} />
      </button>
      {aberto && <div className="mt-3">{children}</div>}
    </div>
  );
}
