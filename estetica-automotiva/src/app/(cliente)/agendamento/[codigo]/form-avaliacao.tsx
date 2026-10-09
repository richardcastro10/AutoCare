"use client";

import { useState } from "react";
import { IconeEstrela } from "@/components/icones";
import { BotaoEnviar } from "@/components/admin/botao-enviar";
import { avaliar } from "./actions";

const RESUMO = ["", "Muito ruim", "Ruim", "Ok", "Bom", "Excelente"];

export function FormAvaliacao({ codigo, loja }: { codigo: string; loja: string }) {
  const [nota, setNota] = useState(0);

  return (
    <form action={avaliar.bind(null, codigo)} className="painel p-4">
      <p className="font-semibold">Como foi na {loja}?</p>
      <p className="text-sm text-texto-suave">Sua nota ajuda outros clientes a escolher.</p>

      <fieldset className="mt-3">
        <legend className="sr-only">Nota de 1 a 5</legend>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} className="cursor-pointer p-1">
              <input
                type="radio"
                name="nota"
                value={n}
                checked={nota === n}
                onChange={() => setNota(n)}
                className="sr-only"
                required
              />
              <IconeEstrela cheia={n <= nota} className={`size-8 ${n <= nota ? "text-dourado" : "text-texto-fraco"}`} />
              <span className="sr-only">
                {n} {n === 1 ? "estrela" : "estrelas"}
              </span>
            </label>
          ))}
          <span className="ml-2 text-sm text-texto-suave">{RESUMO[nota]}</span>
        </div>
      </fieldset>

      {nota > 0 && (
        <>
          <textarea
            name="comentario"
            rows={2}
            maxLength={500}
            className="campo mt-3"
            placeholder="Conte o que achou (opcional)"
          />
          <BotaoEnviar className="btn-primario mt-3 w-full" pendente="Enviando...">
            Enviar avaliação
          </BotaoEnviar>
        </>
      )}
    </form>
  );
}
