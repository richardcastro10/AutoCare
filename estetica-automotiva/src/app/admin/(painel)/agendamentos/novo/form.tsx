"use client";

import { useActionState, useState } from "react";
import type { TipoVeiculo } from "@/generated/prisma/enums";
import type { ServicoCatalogo } from "@/lib/catalogo";
import { NOME_VEICULO, TIPOS_VEICULO } from "@/lib/constantes";
import { formatarDuracao, formatarMoeda } from "@/lib/format";
import { criarAgendamentoBalcao } from "../actions";

export function FormBalcao({
  servicos,
  dataInicial,
  horaInicial,
}: {
  servicos: ServicoCatalogo[];
  dataInicial: string;
  horaInicial: string;
}) {
  const [estado, acao, enviando] = useActionState(criarAgendamentoBalcao, undefined);
  const v = estado?.valores ?? {};
  const [tipo, setTipo] = useState<TipoVeiculo>("CARRO");
  const [selecionados, setSelecionados] = useState<number[]>([]);

  const disponiveis = servicos.filter((s) => s.precos[tipo] !== undefined);
  const escolhidos = disponiveis.filter((s) => selecionados.includes(s.id));
  const total = escolhidos.reduce((t, s) => t + (s.precos[tipo] ?? 0), 0);
  const duracao = escolhidos.reduce((t, s) => t + s.duracaoMin, 0);

  return (
    <form action={acao} className="painel space-y-6 p-5">
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-3 font-semibold">Cliente</legend>
        <div>
          <label className="rotulo" htmlFor="telefone">
            Telefone / WhatsApp
          </label>
          <input id="telefone" name="telefone" defaultValue={v.telefone} className="campo" inputMode="tel" placeholder="(13) 99999-9999" required />
          <p className="mt-1 text-xs text-texto-suave">Se o telefone já existir, usamos o mesmo cadastro.</p>
        </div>
        <div>
          <label className="rotulo" htmlFor="nome">
            Nome
          </label>
          <input id="nome" name="nome" defaultValue={v.nome} className="campo" required />
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-3 font-semibold">Veículo</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {TIPOS_VEICULO.map((t) => (
            <label
              key={t}
              className={`flex cursor-pointer items-center justify-center rounded-md border px-3 py-2.5 text-sm font-medium ${
                tipo === t ? "border-menta bg-menta/10 text-menta" : "border-borda"
              }`}
            >
              <input
                type="radio"
                name="tipo"
                value={t}
                checked={tipo === t}
                onChange={() => setTipo(t)}
                className="sr-only"
              />
              {NOME_VEICULO[t]}
            </label>
          ))}
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_10rem]">
          <div>
            <label className="rotulo" htmlFor="modelo">
              Modelo
            </label>
            <input id="modelo" name="modelo" defaultValue={v.modelo} className="campo" placeholder="Ex.: Onix prata" required />
          </div>
          <div>
            <label className="rotulo" htmlFor="placa">
              Placa
            </label>
            <input id="placa" name="placa" defaultValue={v.placa} className="campo uppercase" placeholder="ABC1D23" />
          </div>
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-3 font-semibold">Serviços</legend>
        <ul className="grid gap-2 sm:grid-cols-2">
          {disponiveis.map((s) => (
            <li key={s.id}>
              <label className="flex cursor-pointer items-center gap-3 rounded-md border border-borda px-3 py-2.5 has-[:checked]:border-menta has-[:checked]:bg-menta/10">
                <input
                  type="checkbox"
                  name="servicoIds"
                  value={s.id}
                  checked={selecionados.includes(s.id)}
                  onChange={(e) =>
                    setSelecionados((ids) => (e.target.checked ? [...ids, s.id] : ids.filter((x) => x !== s.id)))
                  }
                  className="size-4 accent-menta"
                />
                <span className="flex-1 text-sm">
                  <span className="block font-medium">{s.nome}</span>
                  <span className="text-xs text-texto-suave">{formatarDuracao(s.duracaoMin)}</span>
                </span>
                <span className="text-sm font-semibold tabular-nums">{formatarMoeda(s.precos[tipo]!)}</span>
              </label>
            </li>
          ))}
        </ul>
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-3">
        <legend className="mb-3 font-semibold">Quando</legend>
        <div>
          <label className="rotulo" htmlFor="data">
            Data
          </label>
          <input id="data" name="data" type="date" className="campo" defaultValue={v.data ?? dataInicial} required />
        </div>
        <div>
          <label className="rotulo" htmlFor="hora">
            Hora
          </label>
          <input id="hora" name="hora" type="time" step={900} className="campo" defaultValue={v.hora ?? horaInicial} required />
        </div>
        <div>
          <label className="rotulo" htmlFor="status">
            Situação
          </label>
          <select id="status" name="status" className="campo" defaultValue="CONFIRMADO">
            <option value="CONFIRMADO">Confirmado</option>
            <option value="EM_ANDAMENTO">Já começou a lavar</option>
            <option value="PENDENTE">A confirmar</option>
          </select>
        </div>
      </fieldset>

      <div>
        <label className="rotulo" htmlFor="observacoes">
          Observações
        </label>
        <textarea id="observacoes" name="observacoes" defaultValue={v.observacoes} rows={2} className="campo" />
      </div>

      {estado?.erro && (
        <p role="alert" className="rounded-md bg-perigo/10 px-3 py-2 text-sm text-perigo">
          {estado.erro}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-borda pt-4">
        <p className="text-sm">
          Total <strong className="text-lg tabular-nums">{formatarMoeda(total)}</strong>
          {duracao > 0 && <span className="text-texto-suave"> em {formatarDuracao(duracao)}</span>}
        </p>
        <button className="btn-primario" disabled={enviando}>
          {enviando ? "Salvando..." : "Criar agendamento"}
        </button>
      </div>
    </form>
  );
}
