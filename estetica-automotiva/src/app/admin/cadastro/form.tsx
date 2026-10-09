"use client";

import { useActionState } from "react";
import { Aviso } from "@/components/admin/ui";
import { cadastrarLoja } from "./actions";

export function FormCadastro() {
  const [estado, acao, enviando] = useActionState(cadastrarLoja, undefined);
  const v = estado?.valores ?? {};

  return (
    <form action={acao} className="painel mt-6 space-y-6 p-5">
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-3 font-semibold">Sua loja</legend>
        <div className="sm:col-span-2">
          <label className="rotulo" htmlFor="nomeLoja">
            Nome da loja
          </label>
          <input id="nomeLoja" name="nomeLoja" className="campo" defaultValue={v.nomeLoja} required />
        </div>
        <div>
          <label className="rotulo" htmlFor="telefone">
            WhatsApp da loja
          </label>
          <input id="telefone" name="telefone" className="campo" inputMode="tel" placeholder="(13) 99999-9999" defaultValue={v.telefone} required />
        </div>
        <div className="grid grid-cols-[1fr_4.5rem] gap-3">
          <div>
            <label className="rotulo" htmlFor="cidade">
              Cidade
            </label>
            <input id="cidade" name="cidade" className="campo" defaultValue={v.cidade} required />
          </div>
          <div>
            <label className="rotulo" htmlFor="uf">
              UF
            </label>
            <input id="uf" name="uf" className="campo uppercase" maxLength={2} defaultValue={v.uf ?? "SP"} required />
          </div>
        </div>
        <div>
          <label className="rotulo" htmlFor="endereco">
            Endereço
          </label>
          <input id="endereco" name="endereco" className="campo" placeholder="Rua e número" defaultValue={v.endereco} required />
        </div>
        <div>
          <label className="rotulo" htmlFor="bairro">
            Bairro
          </label>
          <input id="bairro" name="bairro" className="campo" defaultValue={v.bairro} />
        </div>
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-3 font-semibold">Seu acesso ao painel</legend>
        <div className="sm:col-span-2">
          <label className="rotulo" htmlFor="nome">
            Seu nome
          </label>
          <input id="nome" name="nome" className="campo" autoComplete="name" defaultValue={v.nome} required />
        </div>
        <div>
          <label className="rotulo" htmlFor="email">
            E-mail
          </label>
          <input id="email" name="email" type="email" className="campo" autoComplete="username" defaultValue={v.email} required />
        </div>
        <div>
          <label className="rotulo" htmlFor="senha">
            Senha
          </label>
          <input id="senha" name="senha" type="password" minLength={6} className="campo" autoComplete="new-password" required />
        </div>
      </fieldset>

      {estado?.erro && <Aviso tipo="erro">{estado.erro}</Aviso>}

      <button className="btn-primario w-full py-3" disabled={enviando}>
        {enviando ? "Criando sua loja..." : "Criar minha loja"}
      </button>
      <p className="text-center text-xs text-texto-suave">
        Depois é só cadastrar seus serviços e preços. A loja passa por uma análise rápida e aparece no app assim que
        for aprovada.
      </p>
    </form>
  );
}
