"use client";

// Formulários da conta do cliente (entrar, criar conta, senha nova).
// Com `voltar`: usados nas páginas /conta/... e a action redireciona pra lá depois.
// Sem `voltar`: usados dentro do agendamento; a action só devolve o resultado e o
// componente avisa o pai (aoEntrar), sem trocar de tela.
import Link from "next/link";
import { useActionState, useId, useState } from "react";
import { mascaraCelular } from "@/lib/format";
import { criarConta, definirNovaSenha, entrar, type EstadoConta } from "@/app/(cliente)/conta/actions";

export type ContaLogada = { nome: string; telefone: string };

type Props = {
  voltar?: string;
  aoEntrar?: (conta: ContaLogada) => void;
};

function Erro({ texto }: { texto?: string }) {
  if (!texto) return null;
  return (
    <p role="alert" className="rounded-lg bg-perigo/10 px-3 py-2 text-sm text-perigo">
      {texto}
    </p>
  );
}

function CampoCelular({ inicial = "" }: { inicial?: string }) {
  const id = useId();
  const [valor, setValor] = useState(mascaraCelular(inicial));
  return (
    <div>
      <label htmlFor={id} className="rotulo">
        Celular (WhatsApp)
      </label>
      <input
        id={id}
        name="telefone"
        className="campo"
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        placeholder="(13) 99999-9999"
        required
        value={valor}
        onChange={(e) => setValor(mascaraCelular(e.target.value))}
      />
    </div>
  );
}

function CampoSenha({ nome, rotulo, novo }: { nome: string; rotulo: string; novo?: boolean }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="rotulo">
        {rotulo}
      </label>
      <input
        id={id}
        name={nome}
        type="password"
        className="campo"
        autoComplete={novo ? "new-password" : "current-password"}
        minLength={novo ? 8 : undefined}
        required
      />
    </div>
  );
}

/** Repassa o resultado pro pai quando o formulário está dentro do agendamento */
function useAcao(acao: typeof entrar, aoEntrar?: (conta: ContaLogada) => void) {
  return useActionState(async (anterior: EstadoConta, formData: FormData) => {
    const resultado = await acao(anterior, formData);
    if (resultado?.ok && resultado.nome && resultado.telefone) {
      aoEntrar?.({ nome: resultado.nome, telefone: resultado.telefone });
    }
    return resultado;
  }, undefined);
}

export function FormEntrar({
  voltar,
  aoEntrar,
  aoPrecisarTrocarSenha,
}: Props & { aoPrecisarTrocarSenha?: () => void }) {
  const [estado, acao, enviando] = useActionState(async (anterior: EstadoConta, formData: FormData) => {
    const resultado = await entrar(anterior, formData);
    if (resultado?.trocarSenha) aoPrecisarTrocarSenha?.();
    if (resultado?.ok && resultado.nome && resultado.telefone) {
      aoEntrar?.({ nome: resultado.nome, telefone: resultado.telefone });
    }
    return resultado;
  }, undefined);

  return (
    // key: a máscara do celular começa com o que foi digitado antes do erro
    <form action={acao} className="space-y-3" key={estado?.telefone}>
      {voltar !== undefined && <input type="hidden" name="voltar" value={voltar} />}
      <CampoCelular inicial={estado?.telefone} />
      <CampoSenha nome="senha" rotulo="Senha" />
      <Erro texto={estado?.erro} />
      <button className="btn-primario w-full" disabled={enviando}>
        {enviando ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}

export function FormCriarConta({ voltar, aoEntrar, aoPedirEntrar }: Props & { aoPedirEntrar?: () => void }) {
  const [estado, acao, enviando] = useAcao(criarConta, aoEntrar);
  const idNome = useId();

  return (
    <form action={acao} className="space-y-3" key={`${estado?.nome}|${estado?.telefone}`}>
      {voltar !== undefined && <input type="hidden" name="voltar" value={voltar} />}
      <div>
        <label htmlFor={idNome} className="rotulo">
          Seu nome
        </label>
        <input id={idNome} name="nome" className="campo" autoComplete="name" defaultValue={estado?.nome} required />
      </div>
      <CampoCelular inicial={estado?.telefone} />
      <CampoSenha nome="senha" rotulo="Senha (mínimo 8 caracteres)" novo />
      <CampoSenha nome="confirmacao" rotulo="Confirme a senha" novo />
      {estado?.jaTemConta ? (
        <p role="alert" className="rounded-lg bg-perigo/10 px-3 py-2 text-sm text-perigo">
          Esse celular já tem conta.{" "}
          {aoPedirEntrar ? (
            <button type="button" onClick={aoPedirEntrar} className="font-semibold underline">
              Entrar?
            </button>
          ) : (
            <Link
              href={`/conta/entrar${voltar ? `?voltar=${encodeURIComponent(voltar)}` : ""}`}
              className="font-semibold underline"
            >
              Entrar?
            </Link>
          )}
        </p>
      ) : (
        <Erro texto={estado?.erro} />
      )}
      <button className="btn-primario w-full" disabled={enviando}>
        {enviando ? "Criando conta..." : "Criar conta"}
      </button>
    </form>
  );
}

export function FormNovaSenha({ voltar, aoEntrar }: Props) {
  const [estado, acao, enviando] = useAcao(definirNovaSenha, aoEntrar);
  return (
    <form action={acao} className="space-y-3">
      {voltar !== undefined && <input type="hidden" name="voltar" value={voltar} />}
      <CampoSenha nome="senha" rotulo="Senha nova (mínimo 8 caracteres)" novo />
      <CampoSenha nome="confirmacao" rotulo="Confirme a senha nova" novo />
      <Erro texto={estado?.erro} />
      <button className="btn-primario w-full" disabled={enviando}>
        {enviando ? "Salvando..." : "Salvar senha nova"}
      </button>
    </form>
  );
}

/** Dentro do agendamento: entrar ou criar conta sem sair da tela */
export function ContaNoAgendamento({ aoEntrar }: { aoEntrar: (conta: ContaLogada) => void }) {
  const [modo, setModo] = useState<"entrar" | "criar" | "nova-senha">("criar");

  if (modo === "nova-senha") {
    return (
      <div className="space-y-3">
        <p className="text-sm text-texto-suave">
          Você entrou com uma senha temporária. Crie uma senha nova pra continuar.
        </p>
        <FormNovaSenha aoEntrar={aoEntrar} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div role="tablist" aria-label="Entrar ou criar conta" className="grid grid-cols-2 rounded-lg border border-borda p-0.5 text-sm">
        {(
          [
            ["criar", "Criar conta"],
            ["entrar", "Já tenho conta"],
          ] as const
        ).map(([chave, rotulo]) => (
          <button
            key={chave}
            type="button"
            role="tab"
            aria-selected={modo === chave}
            onClick={() => setModo(chave)}
            className={`rounded-md px-3 py-2 font-medium ${modo === chave ? "bg-superficie-2 text-texto" : "text-texto-suave"}`}
          >
            {rotulo}
          </button>
        ))}
      </div>
      {modo === "criar" ? (
        <FormCriarConta aoEntrar={aoEntrar} aoPedirEntrar={() => setModo("entrar")} />
      ) : (
        <FormEntrar aoEntrar={aoEntrar} aoPrecisarTrocarSenha={() => setModo("nova-senha")} />
      )}
    </div>
  );
}
