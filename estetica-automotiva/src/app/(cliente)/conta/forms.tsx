"use client";

import { useActionState, useId } from "react";
import { salvarNome, trocarSenha } from "./actions";

function Resultado({ estado, ok }: { estado: { erro?: string; ok?: boolean } | undefined; ok: string }) {
  if (estado?.erro) {
    return (
      <p role="alert" className="rounded-lg bg-perigo/10 px-3 py-2 text-sm text-perigo">
        {estado.erro}
      </p>
    );
  }
  if (estado?.ok) {
    return (
      <p role="status" className="rounded-lg bg-menta/10 px-3 py-2 text-sm text-menta">
        {ok}
      </p>
    );
  }
  return null;
}

export function FormNome({ nome }: { nome: string }) {
  const [estado, acao, enviando] = useActionState(salvarNome, undefined);
  const id = useId();
  return (
    <form action={acao} className="space-y-3">
      <div>
        <label htmlFor={id} className="rotulo">
          Nome
        </label>
        <input id={id} name="nome" className="campo" autoComplete="name" defaultValue={nome} required />
      </div>
      <Resultado estado={estado} ok="Nome salvo." />
      <button className="btn-secundario w-full" disabled={enviando}>
        {enviando ? "Salvando..." : "Salvar nome"}
      </button>
    </form>
  );
}

export function FormTrocarSenha() {
  const [estado, acao, enviando] = useActionState(trocarSenha, undefined);
  const id = useId();
  return (
    // key: limpa os campos depois de trocar
    <form action={acao} className="space-y-3" key={estado?.ok ? "ok" : "form"}>
      {[
        ["atual", "Senha atual", "current-password"],
        ["senha", "Senha nova (mínimo 8 caracteres)", "new-password"],
        ["confirmacao", "Confirme a senha nova", "new-password"],
      ].map(([nome, rotulo, auto]) => (
        <div key={nome}>
          <label htmlFor={`${id}-${nome}`} className="rotulo">
            {rotulo}
          </label>
          <input id={`${id}-${nome}`} name={nome} type="password" className="campo" autoComplete={auto} required />
        </div>
      ))}
      <Resultado estado={estado} ok="Senha trocada. Nos outros aparelhos, entre de novo com a senha nova." />
      <button className="btn-secundario w-full" disabled={enviando}>
        {enviando ? "Salvando..." : "Trocar senha"}
      </button>
    </form>
  );
}
