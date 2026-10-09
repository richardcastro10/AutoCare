"use client";

import { startTransition, useActionState, useState } from "react";
import { MULTIPLICADOR_CONSUMO, NOME_VEICULO, TIPOS_VEICULO } from "@/lib/constantes";
import { formatarMoeda } from "@/lib/format";
import { BotaoEnviar } from "@/components/admin/botao-enviar";
import { CampoImagem } from "@/components/admin/campo-imagem";
import { Aviso } from "@/components/admin/ui";
import { excluirServico, salvarServico } from "../actions";

type Produto = { id: number; nome: string; unidade: string; precoEmbalagem: number; tamanhoEmbalagem: number };

type Props = {
  servico: {
    id: number;
    nome: string;
    resumo: string;
    inclusos: string;
    imagemUrl: string;
    duracaoMin: number;
    ordem: number;
    ativo: boolean;
    destaque: boolean;
    precos: Record<string, number>;
    insumos: { produtoId: number; quantidade: number }[];
  } | null;
  produtos: Produto[];
};

/** centavos -> "50,00" pro campo de texto */
const paraCampo = (centavos?: number) =>
  centavos === undefined ? "" : (centavos / 100).toFixed(2).replace(".", ",");

export function FormServico({ servico, produtos }: Props) {
  const [estado, acao, enviando] = useActionState(salvarServico.bind(null, servico?.id ?? null), undefined);
  const [linhas, setLinhas] = useState(
    servico?.insumos.length ? servico.insumos : [{ produtoId: 0, quantidade: 0 }],
  );

  // custo de produto por lavagem (base: carro)
  const custoCarro = linhas.reduce((total, l) => {
    const p = produtos.find((x) => x.id === l.produtoId);
    return p ? total + (l.quantidade * p.precoEmbalagem) / p.tamanhoEmbalagem : total;
  }, 0);

  return (
    <div className="space-y-6">
      {/*
        Enviamos "na mão" (onSubmit + startTransition) em vez de action={acao}:
        assim o React não limpa o formulário quando a action volta com erro.
      */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const dados = new FormData(e.currentTarget);
          startTransition(() => acao(dados));
        }}
        className="painel space-y-6 p-5"
      >
        <div className="grid gap-4 sm:grid-cols-[1fr_9rem]">
          <div>
            <label className="rotulo" htmlFor="nome">
              Nome
            </label>
            <input id="nome" name="nome" className="campo" defaultValue={servico?.nome} required />
          </div>
          <div>
            <label className="rotulo" htmlFor="duracaoMin">
              Duração (min)
            </label>
            <input
              id="duracaoMin"
              name="duracaoMin"
              type="number"
              min={5}
              step={5}
              className="campo"
              defaultValue={servico?.duracaoMin ?? 60}
              required
            />
          </div>
        </div>

        <div>
          <label className="rotulo" htmlFor="resumo">
            Resumo (aparece embaixo do nome)
          </label>
          <input
            id="resumo"
            name="resumo"
            maxLength={60}
            className="campo"
            placeholder="Ex.: Limpeza completa + cera"
            defaultValue={servico?.resumo}
          />
        </div>

        <CampoImagem
          nome="imagem"
          atual={servico?.imagemUrl}
          rotulo="Foto do serviço"
          dica="JPG, PNG ou WebP até 5 MB. Foto deitada (paisagem) fica melhor."
        />

        <div>
          <label className="rotulo" htmlFor="inclusos">
            O que está incluso (um item por linha)
          </label>
          <textarea
            id="inclusos"
            name="inclusos"
            rows={5}
            className="campo"
            placeholder={"Lavagem externa completa\nLimpeza de rodas e pneus\nAspiração interna"}
            defaultValue={servico?.inclusos}
          />
        </div>

        <fieldset>
          <legend className="rotulo">Preço por tipo de veículo</legend>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {TIPOS_VEICULO.map((t) => (
              <div key={t}>
                <label className="text-xs text-texto-suave" htmlFor={`preco_${t}`}>
                  {NOME_VEICULO[t]}
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-texto-suave">
                    R$
                  </span>
                  <input
                    id={`preco_${t}`}
                    name={`preco_${t}`}
                    inputMode="decimal"
                    className="campo pl-9 text-right"
                    defaultValue={paraCampo(servico?.precos[t])}
                    placeholder="não faz"
                  />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-1 text-xs text-texto-suave">Deixe vazio se não faz esse serviço pra esse tipo.</p>
        </fieldset>

        <fieldset>
          <legend className="rotulo">Ficha técnica (produtos gastos num carro)</legend>
          {produtos.length === 0 ? (
            <p className="text-sm text-texto-suave">Cadastre seus produtos em Estoque pra montar a ficha técnica.</p>
          ) : (
            <>
              <ul className="space-y-2">
                {linhas.map((linha, i) => {
                  const produto = produtos.find((p) => p.id === linha.produtoId);
                  return (
                    <li key={i} className="flex items-center gap-2">
                      <select
                        name="insumo_produto"
                        className="campo flex-1"
                        value={linha.produtoId}
                        onChange={(e) =>
                          setLinhas((ls) => ls.map((l, j) => (j === i ? { ...l, produtoId: Number(e.target.value) } : l)))
                        }
                      >
                        <option value={0}>Escolha o produto</option>
                        {produtos.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.nome}
                          </option>
                        ))}
                      </select>
                      <input
                        name="insumo_qtd"
                        type="number"
                        min={0}
                        step="any"
                        className="campo w-24 text-right"
                        value={linha.quantidade || ""}
                        placeholder="0"
                        onChange={(e) =>
                          setLinhas((ls) =>
                            ls.map((l, j) => (j === i ? { ...l, quantidade: Number(e.target.value) } : l)),
                          )
                        }
                      />
                      <span className="w-6 text-sm text-texto-suave">{produto?.unidade}</span>
                      <button
                        type="button"
                        className="rounded-md px-2 py-2 text-texto-suave hover:bg-perigo/10 hover:text-perigo"
                        aria-label="Remover produto"
                        onClick={() => setLinhas((ls) => ls.filter((_, j) => j !== i))}
                      >
                        ✕
                      </button>
                    </li>
                  );
                })}
              </ul>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  className="text-sm font-medium text-menta"
                  onClick={() => setLinhas((ls) => [...ls, { produtoId: 0, quantidade: 0 }])}
                >
                  + Adicionar produto
                </button>
                <p className="text-xs text-texto-suave">
                  Custo em produto: {formatarMoeda(Math.round(custoCarro))} por carro. Moto gasta{" "}
                  {MULTIPLICADOR_CONSUMO.MOTO * 100}%, SUV {MULTIPLICADOR_CONSUMO.SUV * 100}% e caminhonete{" "}
                  {MULTIPLICADOR_CONSUMO.CAMINHONETE * 100}% disso.
                </p>
              </div>
            </>
          )}
        </fieldset>

        <div className="flex flex-wrap gap-x-6 gap-y-3">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="ativo" defaultChecked={servico?.ativo ?? true} className="size-4 accent-menta" />
            Aparece no app do cliente
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="destaque" defaultChecked={servico?.destaque} className="size-4 accent-menta" />
            Marcar como destaque
          </label>
          <label className="flex items-center gap-2 text-sm">
            Ordem na lista
            <input name="ordem" type="number" className="campo w-20 py-1.5" defaultValue={servico?.ordem ?? 0} />
          </label>
        </div>

        {estado?.erro && <Aviso tipo="erro">{estado.erro}</Aviso>}
        {estado?.ok && <Aviso>Alterações salvas.</Aviso>}

        <div className="flex justify-end border-t border-borda pt-4">
          <button className="btn-primario" disabled={enviando}>
            {enviando ? "Salvando..." : servico ? "Salvar alterações" : "Criar serviço"}
          </button>
        </div>
      </form>

      {servico && (
        <form
          action={excluirServico.bind(null, servico.id)}
          className="flex items-center justify-between gap-3 rounded-xl border border-perigo/40 p-4"
        >
          <p className="text-sm text-texto-suave">
            Excluir serviço. Se já foi usado em algum agendamento, ele só é desativado, pra manter o histórico.
          </p>
          <BotaoEnviar className="btn-perigo shrink-0" pendente="Excluindo...">
            Excluir
          </BotaoEnviar>
        </form>
      )}
    </div>
  );
}
