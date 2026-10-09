"use client";

import Link from "next/link";
import { useActionState, useState, useTransition } from "react";
import type { TipoVeiculo } from "@/generated/prisma/enums";
import type { ServicoCatalogo } from "@/lib/catalogo";
import type { DiaAgenda } from "@/lib/agenda";
import { EXEMPLO_VEICULO, NOME_VEICULO, TIPOS_VEICULO } from "@/lib/constantes";
import {
  formatarData,
  formatarDuracao,
  formatarMes,
  formatarMoeda,
  formatarPlaca,
  formatarTelefone,
  minutosParaHora,
  somarMeses,
} from "@/lib/format";
import {
  IconeCalendario,
  IconeCarteira,
  IconeLocal,
  IconeMais,
  IconeRelogio,
  IconeSeta,
  IconeVeiculo,
  IconeVoltar,
  IconeVoltarSeta,
} from "@/components/icones";
import { Foto } from "@/components/foto";
import { VerificarWhatsApp, type ClienteVerificado } from "@/components/cliente/verificar-whatsapp";
import { buscarHorarios, confirmarAgendamento, trocarCliente, type EstadoAgendamento } from "./actions";

type VeiculoSalvo = { id: number; tipo: TipoVeiculo; modelo: string; placa: string };

type Props = {
  loja: { id: number; slug: string; nome: string; cidade: string; uf: string };
  servico: ServicoCatalogo;
  dias: DiaAgenda[];
  cliente: { nome: string; telefone: string; veiculos: VeiculoSalvo[] } | null;
};

const TITULOS = ["Seu veículo", "Escolha o dia e horário", "Confirme seu agendamento"];

export function Assistente({ loja, servico, dias, cliente: clienteDoAparelho }: Props) {
  // quem acabou de confirmar o WhatsApp nesta tela (o servidor já gravou o cookie)
  const [verificado, setVerificado] = useState<ClienteVerificado | null>(null);
  const cliente = clienteDoAparelho ?? verificado;
  const veiculos = clienteDoAparelho?.veiculos ?? [];
  const atende = (tipo: TipoVeiculo) => servico.precos[tipo] !== undefined;
  const primeiroCompativel = veiculos.find((v) => atende(v.tipo));

  const [etapa, setEtapa] = useState(0);
  const [veiculoSel, setVeiculoSel] = useState<number | "novo">(primeiroCompativel?.id ?? "novo");
  const [novo, setNovo] = useState({ tipo: "CARRO" as TipoVeiculo, modelo: "", placa: "" });
  const [data, setData] = useState<string | null>(null);
  const [inicio, setInicio] = useState<number | null>(null);
  const [horarios, setHorarios] = useState<number[] | null>(null);
  const [buscando, iniciarBusca] = useTransition();

  const [estado, enviar, enviando] = useActionState(
    async (anterior: EstadoAgendamento, formData: FormData) => {
      const resultado = await confirmarAgendamento(anterior, formData);
      // alguém pegou o horário enquanto o cliente confirmava: volta pra escolher outro
      if (resultado?.horarioOcupado && data) {
        setEtapa(1);
        carregarHorarios(data);
      }
      // o cookie deixou de valer no meio do caminho: pede o código de novo
      if (resultado?.precisaVerificar) setVerificado(null);
      return resultado;
    },
    undefined,
  );

  const salvo = typeof veiculoSel === "number" ? veiculos.find((v) => v.id === veiculoSel) : undefined;
  const tipo: TipoVeiculo = salvo?.tipo ?? novo.tipo;
  const preco = servico.precos[tipo];
  const veiculoOk = salvo ? atende(salvo.tipo) : atende(novo.tipo) && novo.modelo.trim().length > 1;
  const descricaoVeiculo = salvo
    ? `${salvo.modelo}${salvo.placa ? ` (${salvo.placa})` : ""}`
    : `${novo.modelo || NOME_VEICULO[novo.tipo]}${novo.placa ? ` (${novo.placa})` : ""}`;

  function carregarHorarios(dia: string) {
    setData(dia);
    setInicio(null);
    iniciarBusca(async () => {
      setHorarios(await buscarHorarios(loja.id, dia, [servico.id]));
    });
  }

  function irParaData() {
    setEtapa(1);
    const primeiroAberto = data ?? dias.find((d) => d.aberto)?.data;
    if (primeiroAberto) carregarHorarios(primeiroAberto);
  }

  return (
    <>
      <header className="sticky top-0 z-20 flex items-center gap-3 bg-fundo/90 px-4 pb-3 pt-[max(0.9rem,env(safe-area-inset-top))] backdrop-blur">
        {etapa === 0 ? (
          <Link
            href={`/loja/${loja.slug}/servico/${servico.id}`}
            className="-ml-1.5 grid size-9 place-items-center rounded-lg hover:bg-superficie-2"
            aria-label="Voltar"
          >
            <IconeVoltarSeta className="size-5" />
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => setEtapa(etapa - 1)}
            className="-ml-1.5 grid size-9 place-items-center rounded-lg hover:bg-superficie-2"
            aria-label="Voltar"
          >
            <IconeVoltarSeta className="size-5" />
          </button>
        )}
        <h1 className="titulo flex-1 truncate text-lg">{TITULOS[etapa]}</h1>
        <span className="text-xs text-texto-suave tabular-nums">{etapa + 1}/3</span>
      </header>

      {/* ---------- 1. Veículo ---------- */}
      {etapa === 0 && (
        <main className="flex-1 px-4">
          <p className="text-sm text-texto-suave">Selecione o veículo para este agendamento.</p>
          <ul className="mt-4 space-y-3" role="radiogroup" aria-label="Veículos">
            {veiculos.map((v) => {
              const pode = atende(v.tipo);
              const marcado = veiculoSel === v.id;
              return (
                <li key={v.id}>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={marcado}
                    disabled={!pode}
                    onClick={() => setVeiculoSel(v.id)}
                    className={`painel flex w-full items-center gap-4 p-4 text-left transition-colors disabled:opacity-45 ${
                      marcado ? "border-menta bg-menta/5" : "hover:border-borda-forte"
                    }`}
                  >
                    <IconeVeiculo tipo={v.tipo} className="h-7 w-12 shrink-0 text-texto" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">{v.modelo}</span>
                      <span className="text-xs text-texto-suave">
                        {pode ? v.placa || NOME_VEICULO[v.tipo] : `Serviço não disponível pra ${NOME_VEICULO[v.tipo].toLowerCase()}`}
                      </span>
                    </span>
                    <Radio marcado={marcado} />
                  </button>
                </li>
              );
            })}
          </ul>

          {veiculoSel === "novo" ? (
            <div className={`painel p-4 ${veiculos.length ? "mt-3 border-menta" : "mt-4"}`}>
              <p className="text-sm font-medium">{veiculos.length ? "Novo veículo" : "Qual é o seu veículo?"}</p>
              <div className="mt-3 grid grid-cols-4 gap-2">
                {TIPOS_VEICULO.map((t) => (
                  <button
                    key={t}
                    type="button"
                    disabled={!atende(t)}
                    onClick={() => setNovo({ ...novo, tipo: t })}
                    aria-pressed={novo.tipo === t}
                    className={`flex flex-col items-center gap-1 rounded-lg border px-1 py-2.5 text-[11px] font-medium disabled:opacity-35 ${
                      novo.tipo === t ? "border-menta bg-menta/10 text-menta" : "border-borda text-texto-suave"
                    }`}
                  >
                    <IconeVeiculo tipo={t} className="h-5 w-9" />
                    {NOME_VEICULO[t]}
                  </button>
                ))}
              </div>
              <div className="mt-3 grid grid-cols-[1fr_7.5rem] gap-2">
                <div>
                  <label htmlFor="modelo" className="rotulo text-xs">
                    Modelo
                  </label>
                  <input
                    id="modelo"
                    className="campo"
                    placeholder={EXEMPLO_VEICULO[novo.tipo].split(",")[0]}
                    value={novo.modelo}
                    onChange={(e) => setNovo({ ...novo, modelo: e.target.value })}
                  />
                </div>
                <div>
                  <label htmlFor="placa" className="rotulo text-xs">
                    Placa
                  </label>
                  <input
                    id="placa"
                    className="campo uppercase"
                    placeholder="ABC1D23"
                    autoCapitalize="characters"
                    value={novo.placa}
                    onChange={(e) => setNovo({ ...novo, placa: formatarPlaca(e.target.value) })}
                  />
                </div>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setVeiculoSel("novo")}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-menta/70 py-3 text-sm font-medium text-texto hover:bg-menta/5"
            >
              <IconeMais className="size-4" />
              Adicionar novo veículo
            </button>
          )}
        </main>
      )}

      {/* ---------- 2. Data e horário ---------- */}
      {etapa === 1 && (
        <main className="flex-1 px-4">
          <Calendario dias={dias} selecionado={data} onEscolher={carregarHorarios} />

          {estado?.horarioOcupado && inicio === null && (
            <p role="alert" className="mt-4 rounded-lg bg-perigo/10 px-3 py-2 text-sm text-perigo">
              {estado.erro}
            </p>
          )}

          {data && (
            <section className="mt-6">
              <h2 className="font-semibold">Horários disponíveis</h2>
              {buscando || horarios === null ? (
                <div className="mt-3 grid grid-cols-3 gap-2.5" aria-busy>
                  {Array.from({ length: 6 }, (_, i) => (
                    <div key={i} className="h-11 animate-pulse rounded-lg bg-superficie" />
                  ))}
                </div>
              ) : horarios.length === 0 ? (
                <p className="painel mt-3 p-4 text-sm text-texto-suave">
                  Sem horário livre nesse dia. Escolha outro dia no calendário.
                </p>
              ) : (
                <div className="mt-3 grid grid-cols-3 gap-2.5">
                  {horarios.map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setInicio(h)}
                      aria-pressed={inicio === h}
                      className={`rounded-lg border py-2.5 text-sm font-medium tabular-nums transition-colors ${
                        inicio === h
                          ? "border-menta bg-menta text-fundo"
                          : "border-borda bg-superficie hover:border-menta/60"
                      }`}
                    >
                      {minutosParaHora(h)}
                    </button>
                  ))}
                </div>
              )}
            </section>
          )}
        </main>
      )}

      {/* ---------- 3. Confirmação ---------- */}
      {etapa === 2 && data && inicio !== null && preco !== undefined && (
        <div className="flex-1 space-y-3 px-4">
          <form id="confirmar" action={enviar} className="space-y-3">
            <input type="hidden" name="lojaId" value={loja.id} />
            <input type="hidden" name="servicoIds" value={servico.id} />
            <input type="hidden" name="data" value={data} />
            <input type="hidden" name="inicio" value={inicio} />
            {salvo ? (
              <input type="hidden" name="veiculoId" value={salvo.id} />
            ) : (
              <>
                <input type="hidden" name="novoTipo" value={novo.tipo} />
                <input type="hidden" name="novoModelo" value={novo.modelo} />
                <input type="hidden" name="novaPlaca" value={novo.placa} />
              </>
            )}

            <div className="painel flex gap-3 p-3">
              <Foto src={servico.imagemUrl} alt={servico.nome} className="h-[4.5rem] w-24 shrink-0 rounded-lg" />
              <div>
                <p className="font-semibold">{servico.nome}</p>
                <p className="font-semibold tabular-nums">{formatarMoeda(preco)}</p>
                <p className="mt-0.5 flex items-center gap-1 text-xs text-texto-suave">
                  <IconeRelogio className="size-3.5" />
                  {formatarDuracao(servico.duracaoMin)}
                </p>
              </div>
            </div>

            <dl className="painel divide-y divide-borda text-sm">
              <Linha icone={<IconeCalendario className="size-5" />} rotulo="Data" valor={formatarData(data)} />
              <Linha icone={<IconeRelogio className="size-5" />} rotulo="Horário" valor={minutosParaHora(inicio)} />
              <Linha
                icone={<IconeVeiculo tipo={tipo} className="h-5 w-7" />}
                rotulo="Veículo"
                valor={descricaoVeiculo}
                embaixo
              />
              <Linha
                icone={<IconeLocal className="size-5" />}
                rotulo="Unidade"
                valor={
                  <>
                    <span className="block text-texto">{loja.nome}</span>
                    <span className="text-texto-suave">
                      {loja.cidade} - {loja.uf}
                    </span>
                  </>
                }
                embaixo
              />
            </dl>

            <div className="painel p-4">
              <div className="flex items-baseline justify-between">
                <span className="font-semibold">Preço total</span>
                <span className="text-xl font-semibold text-menta tabular-nums">{formatarMoeda(preco)}</span>
              </div>
              <p className="mt-2 flex items-center gap-2 text-sm text-texto-suave">
                <IconeCarteira className="size-4" />
                Pagamento na loja
              </p>
            </div>

            <details className="px-1 text-sm">
              <summary className="cursor-pointer text-texto-suave">Adicionar observação</summary>
              <textarea
                name="observacoes"
                rows={2}
                className="campo mt-2"
                placeholder="Ex.: tem cadeirinha de bebê, mancha no banco..."
              />
            </details>

            {cliente && (
              <p className="flex items-center justify-between gap-2 px-1 text-sm text-texto-suave">
                <span>
                  Agendando como <strong className="text-texto">{cliente.nome}</strong>{" "}
                  {formatarTelefone(cliente.telefone)}
                </span>
                <button formAction={trocarCliente.bind(null, loja.slug, servico.id)} className="shrink-0 text-menta">
                  Não é você?
                </button>
              </p>
            )}

            {estado?.erro && !estado.horarioOcupado && (
              <p role="alert" className="rounded-lg bg-perigo/10 px-3 py-2 text-sm text-perigo">
                {estado.erro}
              </p>
            )}
          </form>

          {/* Aparelho sem cliente verificado: confirma o WhatsApp com um código antes de agendar.
              Fica fora do <form> de cima porque tem os próprios formulários (não dá pra aninhar). */}
          {!cliente && (
            <div className="painel p-4">
              <p className="font-semibold">Confirme seu WhatsApp</p>
              <p className="mb-3 mt-1 text-sm text-texto-suave">
                Mandamos um código de 6 números pra garantir que o número é seu. É rápido e só na primeira vez neste
                aparelho.
              </p>
              <VerificarWhatsApp comNome aoVerificar={setVerificado} />
            </div>
          )}
        </div>
      )}

      {/* ---------- Rodapé com o botão da etapa ---------- */}
      <div className="sticky bottom-0 z-20 mt-auto bg-gradient-to-t from-fundo via-fundo to-fundo/0 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-6">
        {etapa === 0 && (
          <button type="button" className="btn-cta" disabled={!veiculoOk} onClick={irParaData}>
            Continuar
          </button>
        )}
        {etapa === 1 && (
          <button type="button" className="btn-cta" disabled={inicio === null} onClick={() => setEtapa(2)}>
            Continuar
          </button>
        )}
        {etapa === 2 && (
          <>
            {/* só libera depois que o WhatsApp foi confirmado (o servidor também exige o cookie) */}
            <button type="submit" form="confirmar" className="btn-cta" disabled={enviando || !cliente}>
              {enviando ? "Agendando..." : "Confirmar agendamento"}
            </button>
            <p className="mt-2 text-center text-xs text-texto-suave">
              {cliente ? "A loja confirma o horário pelo WhatsApp." : "Confirme seu WhatsApp pra liberar o agendamento."}
            </p>
          </>
        )}
      </div>
    </>
  );
}

function Radio({ marcado }: { marcado: boolean }) {
  return (
    <span
      aria-hidden
      className={`grid size-5 shrink-0 place-items-center rounded-full border-2 ${
        marcado ? "border-menta" : "border-texto-fraco"
      }`}
    >
      {marcado && <span className="size-2.5 rounded-full bg-menta" />}
    </span>
  );
}

function Linha({
  icone,
  rotulo,
  valor,
  embaixo,
}: {
  icone: React.ReactNode;
  rotulo: string;
  valor: React.ReactNode;
  embaixo?: boolean;
}) {
  return (
    <div className={`flex gap-3 px-4 py-3 ${embaixo ? "items-start" : "items-center"}`}>
      <span className="shrink-0 text-texto-suave">{icone}</span>
      {embaixo ? (
        <div>
          <dt className="text-texto-suave">{rotulo}</dt>
          <dd className="mt-0.5">{valor}</dd>
        </div>
      ) : (
        <>
          <dt className="flex-1 text-texto-suave">{rotulo}</dt>
          <dd className="tabular-nums">{valor}</dd>
        </>
      )}
    </div>
  );
}

// ---------- Calendário do mês ----------

const SIGLAS = ["D", "S", "T", "Q", "Q", "S", "S"];

function Calendario({
  dias,
  selecionado,
  onEscolher,
}: {
  dias: DiaAgenda[];
  selecionado: string | null;
  onEscolher: (data: string) => void;
}) {
  const primeiroMes = dias[0].data.slice(0, 7);
  const ultimoMes = dias.at(-1)!.data.slice(0, 7);
  const [mes, setMes] = useState((selecionado ?? dias[0].data).slice(0, 7));

  const [ano, numMes] = mes.split("-").map(Number);
  const inicioSemana = new Date(Date.UTC(ano, numMes - 1, 1)).getUTCDay();
  const totalDias = new Date(Date.UTC(ano, numMes, 0)).getUTCDate();
  const porData = new Map(dias.map((d) => [d.data, d]));

  return (
    <div className="painel p-4">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setMes(somarMeses(mes, -1))}
          disabled={mes <= primeiroMes}
          className="grid size-8 place-items-center rounded-lg hover:bg-superficie-2 disabled:opacity-30"
          aria-label="Mês anterior"
        >
          <IconeVoltar className="size-4" />
        </button>
        <p className="text-sm font-medium first-letter:uppercase">{formatarMes(mes)}</p>
        <button
          type="button"
          onClick={() => setMes(somarMeses(mes, 1))}
          disabled={mes >= ultimoMes}
          className="grid size-8 place-items-center rounded-lg hover:bg-superficie-2 disabled:opacity-30"
          aria-label="Próximo mês"
        >
          <IconeSeta className="size-4" />
        </button>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-y-1 text-center text-sm">
        {SIGLAS.map((s, i) => (
          <span key={i} className="pb-1 text-xs text-texto-suave">
            {s}
          </span>
        ))}
        {Array.from({ length: inicioSemana }, (_, i) => (
          <span key={`vazio-${i}`} />
        ))}
        {Array.from({ length: totalDias }, (_, i) => {
          const data = `${mes}-${String(i + 1).padStart(2, "0")}`;
          const dia = porData.get(data);
          const ativo = data === selecionado;
          return (
            <span key={data} className="grid place-items-center">
              <button
                type="button"
                disabled={!dia?.aberto}
                onClick={() => onEscolher(data)}
                title={dia?.motivo}
                aria-pressed={ativo}
                aria-label={`Dia ${i + 1}${dia?.motivo ? `, ${dia.motivo}` : ""}`}
                className={`grid size-9 place-items-center rounded-full tabular-nums transition-colors ${
                  ativo
                    ? "bg-menta font-semibold text-fundo"
                    : dia?.aberto
                      ? "hover:bg-superficie-2"
                      : "text-texto-fraco/60 line-through decoration-transparent"
                }`}
              >
                {i + 1}
              </button>
            </span>
          );
        })}
      </div>
    </div>
  );
}
