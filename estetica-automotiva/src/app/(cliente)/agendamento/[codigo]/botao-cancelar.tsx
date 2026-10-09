"use client";

import { useState, useTransition } from "react";
import { cancelarAgendamento } from "./actions";

export function BotaoCancelar({ codigo }: { codigo: string }) {
  const [confirmando, setConfirmando] = useState(false);
  const [pendente, iniciar] = useTransition();

  if (!confirmando) {
    return (
      <button type="button" className="btn-perigo w-full" onClick={() => setConfirmando(true)}>
        Cancelar agendamento
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-perigo/40 bg-perigo/10 p-4">
      <p className="font-semibold text-perigo">Cancelar este horário?</p>
      <p className="mt-1 text-sm text-texto-suave">A vaga fica livre pra outra pessoa.</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button type="button" className="btn-secundario" onClick={() => setConfirmando(false)} disabled={pendente}>
          Manter
        </button>
        <button
          type="button"
          className="btn-primario bg-perigo text-fundo hover:bg-perigo/85"
          disabled={pendente}
          onClick={() => iniciar(() => cancelarAgendamento(codigo))}
        >
          {pendente ? "Cancelando..." : "Sim, cancelar"}
        </button>
      </div>
    </div>
  );
}
