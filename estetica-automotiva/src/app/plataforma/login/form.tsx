"use client";

import { useActionState } from "react";
import { entrarPlataforma } from "./actions";

export function FormLoginPlataforma() {
  const [estado, acao, enviando] = useActionState(entrarPlataforma, undefined);

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
        </p>
      )}
      <button type="submit" className="btn-primario w-full" disabled={enviando}>
        {enviando ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}
