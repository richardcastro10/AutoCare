"use client";

import { useState } from "react";
import { Foto } from "../foto";
import { IconeCamera } from "../icones";

/**
 * Campo de foto com pré-visualização.
 * Envia o arquivo no campo `nome` e, se o usuário tirar a foto atual,
 * marca o checkbox `remover<Nome>` (ex.: removerImagem).
 */
export function CampoImagem({
  nome,
  atual,
  rotulo,
  dica,
  className = "aspect-[16/10] w-full max-w-sm",
}: {
  nome: string;
  atual?: string;
  rotulo: string;
  dica?: string;
  className?: string;
}) {
  const [previa, setPrevia] = useState<string | null>(null);
  const [removida, setRemovida] = useState(false);
  const campoRemover = `remover${nome.charAt(0).toUpperCase()}${nome.slice(1)}`;
  const mostrando = previa ?? (removida ? "" : atual ?? "");

  return (
    <div>
      <p className="rotulo">{rotulo}</p>
      <div className="flex flex-wrap items-end gap-4">
        <Foto src={mostrando} alt={rotulo} className={`${className} rounded-xl border border-borda`} />
        <div className="flex flex-col gap-2">
          <label className="btn-secundario cursor-pointer">
            <IconeCamera className="size-4" />
            {mostrando ? "Trocar foto" : "Enviar foto"}
            <input
              type="file"
              name={nome}
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={(e) => {
                const arquivo = e.target.files?.[0];
                setPrevia(arquivo ? URL.createObjectURL(arquivo) : null);
                setRemovida(false);
              }}
            />
          </label>
          {mostrando && !previa && (
            <label className="flex items-center gap-2 text-sm text-texto-suave">
              <input
                type="checkbox"
                name={campoRemover}
                checked={removida}
                onChange={(e) => setRemovida(e.target.checked)}
                className="size-4 accent-menta"
              />
              Remover foto
            </label>
          )}
          {/* se marcou "remover", o checkbox some; mantém o valor no formulário */}
          {removida && <input type="hidden" name={campoRemover} value="on" />}
          {removida && (
            <button type="button" className="text-left text-sm text-menta" onClick={() => setRemovida(false)}>
              Desfazer
            </button>
          )}
        </div>
      </div>
      {dica && <p className="mt-2 text-xs text-texto-suave">{dica}</p>}
    </div>
  );
}
