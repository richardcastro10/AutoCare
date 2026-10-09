"use client";

import { useActionState } from "react";
import { entrar } from "./actions";

export function FormLogin() {
  const [estado, acao, enviando] = useActionState(entrar, undefined);

  return (
    <form action={acao} className="mt-5 space-y-4">
      <div>
        <label htmlFor="email" className="rotulo">
          E-mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          className="campo"
          autoComplete="username"
          defaultValue={estado?.email}
          required
        />
      </div>
      <div>
        <label htmlFor="senha" className="rotulo">
          Senha
        </label>
        <input
          id="senha"
          name="senha"
          type="password"
          className="campo"
          autoComplete="current-password"
          required
        />
      </div>
      {estado?.erro && (
        <p role="alert" className="rounded-md bg-perigo/10 px-3 py-2 text-sm text-perigo">
          {estado.erro}
          {estado.motivo && <span className="mt-1 block text-texto-suave">Motivo: {estado.motivo}</span>}
        </p>
      )}
      <button type="submit" className="btn-primario w-full" disabled={enviando}>
        {enviando ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}
