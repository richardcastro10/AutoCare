"use client";

import { useState } from "react";
import { FORMAS_PAGAMENTO, NOME_PAGAMENTO } from "@/lib/constantes";
import { formatarMoeda, formatarQuantidade, lerMoeda } from "@/lib/format";
import { BotaoEnviar } from "@/components/admin/botao-enviar";
import { concluirAgendamento } from "../actions";

type Consumo = { produtoId: number; nome: string; unidade: string; quantidade: number; estoque: number };

export function FormConcluir({ id, total, consumos }: { id: number; total: number; consumos: Consumo[] }) {
  const [desconto, setDesconto] = useState("");
  const [forma, setForma] = useState("PIX");
  const valorFinal = Math.max(total - lerMoeda(desconto), 0);

  return (
    <form action={concluirAgendamento.bind(null, id)} className="painel">
      <div className="border-b border-borda px-4 py-3">
        <h2 className="font-semibold">Concluir e registrar pagamento</h2>
        <p className="text-sm text-texto-suave">Isso também dá baixa no estoque dos produtos usados.</p>
      </div>

      <div className="grid gap-6 p-4 md:grid-cols-2">
        <fieldset>
          <legend className="rotulo">Forma de pagamento</legend>
          <div className="grid grid-cols-2 gap-2">
            {FORMAS_PAGAMENTO.map((f) => (
              <label
                key={f}
                className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2.5 text-sm font-medium ${
                  forma === f ? "border-menta bg-menta/10 text-menta" : "border-borda"
                }`}
              >
                <input
                  type="radio"
                  name="formaPagamento"
                  value={f}
                  checked={forma === f}
                  onChange={() => setForma(f)}
                  className="accent-menta"
                />
                {NOME_PAGAMENTO[f]}
              </label>
            ))}
          </div>

          <label htmlFor="desconto" className="rotulo mt-4">
            Desconto (R$)
          </label>
          <input
            id="desconto"
            name="desconto"
            inputMode="decimal"
            placeholder="0,00"
            className="campo"
            value={desconto}
            onChange={(e) => setDesconto(e.target.value)}
          />

          <div className="mt-4 flex items-baseline justify-between rounded-md bg-superficie-2 px-3 py-3">
            <span className="text-sm">Valor a receber</span>
            <span className="text-2xl font-bold tabular-nums">{formatarMoeda(valorFinal)}</span>
          </div>
        </fieldset>

        <fieldset>
          <legend className="rotulo">Produtos usados</legend>
          {consumos.length === 0 ? (
            <p className="text-sm text-texto-suave">
              Esses serviços não têm produtos cadastrados na ficha técnica.
            </p>
          ) : (
            <ul className="space-y-2">
              {consumos.map((c) => (
                <li key={c.produtoId} className="flex items-center gap-3">
                  <label htmlFor={`consumo_${c.produtoId}`} className="min-w-0 flex-1 text-sm">
                    <span className="block truncate">{c.nome}</span>
                    <span className={`text-xs ${c.estoque < c.quantidade ? "text-perigo" : "text-texto-suave"}`}>
                      Em estoque: {formatarQuantidade(c.estoque, c.unidade)}
                    </span>
                  </label>
                  <div className="flex w-32 items-center gap-1">
                    <input
                      id={`consumo_${c.produtoId}`}
                      name={`consumo_${c.produtoId}`}
                      type="number"
                      min={0}
                      step="any"
                      defaultValue={c.quantidade}
                      className="campo py-1.5 text-right"
                    />
                    <span className="w-6 text-xs text-texto-suave">{c.unidade}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-xs text-texto-suave">
            Quantidades sugeridas pela ficha técnica do serviço. Ajuste se usou mais ou menos.
          </p>
        </fieldset>
      </div>

      <div className="flex justify-end border-t border-borda px-4 py-3">
        <BotaoEnviar pendente="Concluindo...">Concluir serviço</BotaoEnviar>
      </div>
    </form>
  );
}
