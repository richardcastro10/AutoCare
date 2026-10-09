"use client";

import { useActionState } from "react";
import { trocarSenha } from "./actions";

export function FormSenha() {
  const [estado, acao, enviando] = useActionState(trocarSenha, undefined);
  return (
    <form action={acao} className="space-y-3 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="rotulo" htmlFor="atual">
            Senha atual
          </label>
          <input id="atual" name="atual" type="password" className="campo" autoComplete="current-password" required />
        </div>
        <div>
          <label className="rotulo" htmlFor="nova">
            Nova senha
          </label>
          <input id="nova" name="nova" type="password" className="campo" autoComplete="new-password" minLength={6} required />
        </div>
      </div>
      {estado?.erro && <p className="text-sm text-perigo">{estado.erro}</p>}
      {estado?.ok && <p className="text-sm text-menta">Senha alterada.</p>}
      <button className="btn-secundario" disabled={enviando}>
        {enviando ? "Salvando..." : "Trocar senha"}
      </button>
    </form>
  );
}
