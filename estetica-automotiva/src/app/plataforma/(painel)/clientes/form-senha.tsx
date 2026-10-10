"use client";

import { useActionState } from "react";
import { Aviso } from "@/components/admin/ui";
import { gerarSenhaTemporaria } from "./actions";

// A senha gerada só existe no estado deste componente: recarregou a página, sumiu.
export function FormSenhaTemporaria({ clienteId, temConta }: { clienteId: number; temConta: boolean }) {
  const [estado, acao, enviando] = useActionState(gerarSenhaTemporaria, undefined);

  if (estado?.senha) {
    return (
      <div className="space-y-2 rounded-lg border border-dourado/50 bg-dourado/10 p-4">
        <p className="text-sm text-texto-suave">Senha temporária (aparece só agora, anote ou copie):</p>
        <p className="select-all font-mono text-2xl font-semibold tracking-wider text-dourado" data-testid="senha-temporaria">
          {estado.senha}
        </p>
        <p className="text-xs text-texto-suave">
          Passe pro cliente. No próximo login ele é obrigado a criar uma senha nova. As sessões abertas dele caíram.
        </p>
      </div>
    );
  }

  return (
    <form
      action={acao}
      className="space-y-2"
      onSubmit={(e) => {
        if (!confirm("Gerar uma senha temporária? A senha atual do cliente deixa de valer.")) e.preventDefault();
      }}
    >
      <input type="hidden" name="clienteId" value={clienteId} />
      {estado?.erro && <Aviso tipo="erro">{estado.erro}</Aviso>}
      <button className="btn-primario" disabled={enviando}>
        {enviando ? "Gerando..." : "Gerar senha temporária"}
      </button>
      {!temConta && (
        <p className="text-xs text-texto-suave">Esse cliente é só de balcão: a senha temporária cria a conta dele no app.</p>
      )}
    </form>
  );
}
