"use client";

import { startTransition, useActionState, useRef } from "react";
import { CampoImagem } from "@/components/admin/campo-imagem";
import { Aviso } from "@/components/admin/ui";
import { IconeMira } from "@/components/icones";
import { LogoLoja } from "@/components/marca";
import { salvarLoja } from "./actions";

type Loja = {
  nome: string;
  descricao: string;
  telefone: string;
  endereco: string;
  bairro: string;
  cidade: string;
  uf: string;
  latitude: number | null;
  longitude: number | null;
  capaUrl: string;
  logoUrl: string;
  ativa: boolean;
};

/** `uploads` desligado (UPLOADS_HABILITADOS): sem campos de foto, só a logo atual pra conferir */
export function FormLoja({ loja, uploads }: { loja: Loja; uploads: boolean }) {
  const [estado, acao, enviando] = useActionState(salvarLoja, undefined);
  const lat = useRef<HTMLInputElement>(null);
  const lng = useRef<HTMLInputElement>(null);

  function usarLocalizacao() {
    navigator.geolocation?.getCurrentPosition((p) => {
      if (lat.current) lat.current.value = p.coords.latitude.toFixed(6);
      if (lng.current) lng.current.value = p.coords.longitude.toFixed(6);
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const dados = new FormData(e.currentTarget);
        startTransition(() => acao(dados));
      }}
      className="space-y-5 p-4"
    >
      {uploads ? (
        <div className="grid gap-5 md:grid-cols-[2fr_1fr]">
          <CampoImagem
            nome="capa"
            atual={loja.capaUrl}
            rotulo="Foto da fachada (capa)"
            dica="Aparece no topo da sua página e na lista de lojas."
          />
          <CampoImagem
            nome="logo"
            atual={loja.logoUrl}
            rotulo="Logo"
            className="aspect-square w-28"
            dica="Fundo transparente (PNG) fica melhor. A transparência é mantida."
          />
        </div>
      ) : (
        <div className="flex items-center gap-4 rounded-lg border border-borda bg-superficie-2/50 p-3">
          <div className="grid h-20 w-28 shrink-0 place-items-center">
            <LogoLoja nome={loja.nome} logoUrl={loja.logoUrl} />
          </div>
          <p className="text-sm text-texto-suave">
            O envio de fotos está desligado por enquanto. Pra trocar a logo, fale com o suporte do app.
          </p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="rotulo" htmlFor="nome">
            Nome da loja
          </label>
          <input id="nome" name="nome" className="campo" defaultValue={loja.nome} required />
        </div>
        <div>
          <label className="rotulo" htmlFor="telefone">
            WhatsApp da loja
          </label>
          <input id="telefone" name="telefone" className="campo" inputMode="tel" defaultValue={loja.telefone} />
        </div>
        <div className="sm:col-span-2">
          <label className="rotulo" htmlFor="descricao">
            Sobre a loja
          </label>
          <textarea id="descricao" name="descricao" rows={2} maxLength={400} className="campo" defaultValue={loja.descricao} />
        </div>
        <div>
          <label className="rotulo" htmlFor="endereco">
            Endereço
          </label>
          <input id="endereco" name="endereco" className="campo" defaultValue={loja.endereco} />
        </div>
        <div>
          <label className="rotulo" htmlFor="bairro">
            Bairro
          </label>
          <input id="bairro" name="bairro" className="campo" defaultValue={loja.bairro} />
        </div>
        <div className="grid grid-cols-[1fr_4.5rem] gap-3">
          <div>
            <label className="rotulo" htmlFor="cidade">
              Cidade
            </label>
            <input id="cidade" name="cidade" className="campo" defaultValue={loja.cidade} />
          </div>
          <div>
            <label className="rotulo" htmlFor="uf">
              UF
            </label>
            <input id="uf" name="uf" maxLength={2} className="campo uppercase" defaultValue={loja.uf} />
          </div>
        </div>
        <div>
          <span className="rotulo">Localização no mapa (pra mostrar a distância)</span>
          <div className="flex gap-2">
            <input ref={lat} name="latitude" aria-label="Latitude" placeholder="Latitude" className="campo" defaultValue={loja.latitude ?? ""} />
            <input ref={lng} name="longitude" aria-label="Longitude" placeholder="Longitude" className="campo" defaultValue={loja.longitude ?? ""} />
            <button type="button" onClick={usarLocalizacao} className="btn-secundario shrink-0 px-3" title="Usar a localização deste aparelho">
              <IconeMira className="size-4" />
            </button>
          </div>
          <p className="mt-1 text-xs text-texto-suave">
            Estando na loja, toque no alvo. Ou copie do Google Maps (clique com o botão direito no local).
          </p>
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="ativa" defaultChecked={loja.ativa} className="size-4 accent-menta" />
        Loja aparece no app e aceita agendamentos
      </label>

      {estado?.erro && <Aviso tipo="erro">{estado.erro}</Aviso>}
      {estado?.ok && <Aviso>{estado.ok}</Aviso>}

      <div className="flex justify-end">
        <button className="btn-primario" disabled={enviando}>
          {enviando ? "Salvando..." : "Salvar dados da loja"}
        </button>
      </div>
    </form>
  );
}
