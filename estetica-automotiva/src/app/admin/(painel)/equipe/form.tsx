"use client";

import { useActionState } from "react";
import { Aviso } from "@/components/admin/ui";
import { adicionarUsuario } from "./actions";

export function FormEquipe() {
  const [estado, acao, enviando] = useActionState(adicionarUsuario, undefined);
  return (
    <form action={acao} className="space-y-3 p-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_9rem_9rem_auto] sm:items-end">
        <div>
          <label className="rotulo" htmlFor="u-nome">
            Nome
          </label>
          <input id="u-nome" name="nome" className="campo" required />
        </div>
        <div>
          <label className="rotulo" htmlFor="u-email">
            E-mail
          </label>
          <input id="u-email" name="email" type="email" className="campo" required />
        </div>
        <div>
          <label className="rotulo" htmlFor="u-senha">
            Senha inicial
          </label>
          <input id="u-senha" name="senha" type="password" minLength={6} className="campo" required />
        </div>
        <div>
          <label className="rotulo" htmlFor="u-papel">
            Acesso
          </label>
          <select id="u-papel" name="papel" className="campo">
            <option value="FUNCIONARIO">Funcionário</option>
            <option value="ADMIN">Administrador</option>
          </select>
        </div>
        <button className="btn-primario" disabled={enviando}>
          {enviando ? "..." : "Adicionar"}
        </button>
      </div>
      {estado?.erro && <Aviso tipo="erro">{estado.erro}</Aviso>}
      {estado?.ok && <Aviso>{estado.ok}</Aviso>}
    </form>
  );
}
