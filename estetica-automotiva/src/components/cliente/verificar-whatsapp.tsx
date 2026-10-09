"use client";

// Confirma que o WhatsApp é do cliente: ele pede um código, digita os 6 números
// e o servidor grava o cookie. Usado no agendamento (com nome) e em "Meus horários".
import { useActionState, useEffect, useState } from "react";
import { somenteDigitos } from "@/lib/format";
import {
  enviarCodigo,
  verificarCodigo,
  type EstadoEnvio,
  type EstadoVerificacao,
} from "@/app/(cliente)/meus-agendamentos/actions";

export type ClienteVerificado = { nome: string; telefone: string };

type Props = {
  /** No agendamento pedimos o nome (pra criar o cliente se o número for novo) */
  comNome?: boolean;
  /** Código certo. `cliente` vem null quando o número não tem cadastro e não foi pedido nome */
  aoVerificar?: (cliente: ClienteVerificado | null) => void;
};

export function VerificarWhatsApp(props: Props) {
  // "Trocar número" recomeça do zero: mudar a key recria o formulário (e os dois useActionState)
  const [versao, setVersao] = useState(0);
  return <Formulario key={versao} {...props} aoTrocarNumero={() => setVersao((v) => v + 1)} />;
}

function Formulario({ comNome, aoVerificar, aoTrocarNumero }: Props & { aoTrocarNumero: () => void }) {
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [codigo, setCodigo] = useState("");
  const [restante, setRestante] = useState(0); // segundos até poder reenviar
  const [liberaEm, setLiberaEm] = useState(0);

  const [envio, pedirCodigo, pedindo] = useActionState(async (anterior: EstadoEnvio, formData: FormData) => {
    const resultado = await enviarCodigo(anterior, formData);
    if (resultado?.aguardarSeg) {
      setRestante(resultado.aguardarSeg);
      setLiberaEm(Date.now() + resultado.aguardarSeg * 1000);
    }
    if (resultado?.ok) setCodigo("");
    return resultado;
  }, undefined);

  const [verificacao, verificar, verificando] = useActionState(
    async (anterior: EstadoVerificacao, formData: FormData) => {
      const resultado = await verificarCodigo(anterior, formData);
      if (resultado && "ok" in resultado) aoVerificar?.(resultado.cliente);
      else setCodigo("");
      return resultado;
    },
    undefined,
  );

  // contagem regressiva do "Reenviar código"
  useEffect(() => {
    if (!liberaEm) return;
    const relogio = setInterval(() => {
      setRestante(Math.max(0, Math.ceil((liberaEm - Date.now()) / 1000)));
    }, 1000);
    return () => clearInterval(relogio);
  }, [liberaEm]);

  // já existe um código a caminho (acabou de pedir, ou pediu há pouco e o servidor mandou esperar)
  const codigoPedido = Boolean(envio?.ok || envio?.aguardarSeg);
  const telefoneOk = [10, 11].includes(somenteDigitos(telefone).length);
  const podePedir = telefoneOk && (!comNome || nome.trim().length >= 2);

  return (
    <div className="space-y-3">
      <form id="pedir-codigo" action={pedirCodigo} className="space-y-3">
        {comNome && (
          <div>
            <label htmlFor="nome" className="rotulo">
              Seu nome
            </label>
            <input
              id="nome"
              className="campo"
              autoComplete="name"
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
            />
          </div>
        )}
        <div>
          <label htmlFor="telefone" className="rotulo">
            WhatsApp
          </label>
          <input
            id="telefone"
            name="telefone"
            className="campo read-only:opacity-70"
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            placeholder="(13) 99999-9999"
            required
            readOnly={codigoPedido}
            value={telefone}
            onChange={(e) => setTelefone(mascaraTelefone(e.target.value))}
          />
        </div>
        {!codigoPedido && (
          <button className="btn-secundario w-full" disabled={!podePedir || pedindo}>
            {pedindo ? "Enviando..." : "Receber código"}
          </button>
        )}
        {envio && (
          <p
            role={envio.ok ? "status" : "alert"}
            className={`rounded-lg px-3 py-2 text-sm ${envio.ok ? "bg-menta/10 text-menta" : "bg-perigo/10 text-perigo"}`}
          >
            {envio.mensagem}
          </p>
        )}
      </form>

      {codigoPedido && (
        <>
          <form action={verificar} className="space-y-3">
            <input type="hidden" name="telefone" value={telefone} />
            <input type="hidden" name="nome" value={nome} />
            {comNome && <input type="hidden" name="exigeNome" value="1" />}
            <div>
              <label htmlFor="codigo" className="rotulo">
                Código de 6 números
              </label>
              <input
                id="codigo"
                name="codigo"
                className="campo text-center text-xl tracking-[0.4em] tabular-nums"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                placeholder="000000"
                required
                value={codigo}
                onChange={(e) => setCodigo(somenteDigitos(e.target.value).slice(0, 6))}
              />
            </div>
            {verificacao && "erro" in verificacao && (
              <p role="alert" className="rounded-lg bg-perigo/10 px-3 py-2 text-sm text-perigo">
                {verificacao.erro}
              </p>
            )}
            <button className="btn-primario w-full" disabled={codigo.length !== 6 || verificando}>
              {verificando ? "Conferindo..." : "Confirmar código"}
            </button>
          </form>

          <div className="flex items-center justify-between gap-3 text-sm">
            {/* botão fora do form: o atributo form liga ele ao formulário de pedir código */}
            <button
              form="pedir-codigo"
              className="font-medium text-menta disabled:text-texto-fraco"
              disabled={restante > 0 || pedindo}
            >
              {pedindo ? "Enviando..." : restante > 0 ? `Reenviar código (${tempoCurto(restante)})` : "Reenviar código"}
            </button>
            <button type="button" className="text-texto-suave" onClick={aoTrocarNumero}>
              Trocar número
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/** 42 -> "42s", 1500 -> "25 min" */
function tempoCurto(segundos: number) {
  return segundos <= 90 ? `${segundos}s` : `${Math.ceil(segundos / 60)} min`;
}

function mascaraTelefone(valor: string) {
  const d = somenteDigitos(valor).slice(0, 11);
  if (d.length <= 2) return d ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}
