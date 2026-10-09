"use client";

import { useActionState } from "react";
import { Aviso } from "@/components/admin/ui";
import { suspenderLoja } from "./actions";

// Suspender sempre pede o motivo: é o texto que o dono da loja vê ao tentar entrar
export function FormSuspender({ lojaId }: { lojaId: number }) {
  const [estado, acao, enviando] = useActionState(suspenderLoja, undefined);

  return (
    <details className="group">
      <summary className="btn-perigo cursor-pointer list-none">Suspender</summary>
      <form action={acao} className="mt-3 space-y-3">
        <input type="hidden" name="lojaId" value={lojaId} />
        <div>
          <label htmlFor="motivo" className="rotulo">
            Motivo da suspensão
          </label>
          <textarea
            id="motivo"
            name="motivo"
            rows={3}
            maxLength={300}
            className="campo"
            placeholder="Ex.: reclamações de clientes sem resposta"
            defaultValue={estado?.motivo}
            required
          />
          <p className="mt-1 text-xs text-texto-suave">
            A loja some do app, o agendamento é bloqueado e ninguém da loja entra no painel. O dono vê esse motivo.
          </p>
        </div>
        {estado?.erro && <Aviso tipo="erro">{estado.erro}</Aviso>}
        <button className="btn-perigo" disabled={enviando}>
          {enviando ? "Suspendendo..." : "Confirmar suspensão"}
        </button>
      </form>
    </details>
  );
}
