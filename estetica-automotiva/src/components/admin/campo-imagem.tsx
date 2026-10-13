"use client";

import { useState } from "react";
import { Foto } from "../foto";
import { IconeCamera } from "../icones";

// A Vercel aceita no máximo 4,5 MB por requisição (e a action, 4 MB: next.config.ts).
// Foto de celular passa disso fácil, então ela é reduzida AQUI, no navegador, antes de enviar:
// lado maior de 1600 px, WebP (ou JPEG no navegador que não gera WebP), mirando 1,5 MB.
const LADO_MAXIMO = 1600;
const ALVO_BYTES = 1.5 * 1024 * 1024;
const LIMITE_ENVIO = 4 * 1024 * 1024;

const tamanho = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;

/** Reduz e recomprime a foto no navegador. Devolve o arquivo novo (ou null se não deu pra ler) */
async function comprimir(original: File): Promise<File | null> {
  let imagem: ImageBitmap;
  try {
    // "from-image": respeita a orientação da foto do celular (EXIF)
    imagem = await createImageBitmap(original, { imageOrientation: "from-image" });
  } catch {
    return null;
  }
  const escala = Math.min(1, LADO_MAXIMO / Math.max(imagem.width, imagem.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(imagem.width * escala);
  canvas.height = Math.round(imagem.height * escala);
  canvas.getContext("2d")!.drawImage(imagem, 0, 0, canvas.width, canvas.height);
  imagem.close();

  const gerar = (tipo: string, qualidade: number) =>
    new Promise<Blob | null>((ok) => canvas.toBlob(ok, tipo, qualidade));

  // WebP mantém a transparência (logo). Navegador sem WebP devolve PNG: aí vai de JPEG.
  let tipo = "image/webp";
  let blob = await gerar(tipo, 0.85);
  if (!blob || blob.type !== "image/webp") {
    tipo = "image/jpeg";
    blob = await gerar(tipo, 0.85);
  }
  for (const qualidade of [0.75, 0.65, 0.5]) {
    if (!blob || blob.size <= ALVO_BYTES) break;
    blob = await gerar(tipo, qualidade);
  }
  if (!blob) return null;

  const nome = original.name.replace(/\.[^.]+$/, "") + (tipo === "image/webp" ? ".webp" : ".jpg");
  return new File([blob], nome, { type: tipo, lastModified: Date.now() });
}

/**
 * Campo de foto com pré-visualização.
 * Envia o arquivo (já comprimido) no campo `nome` e, se o usuário tirar a foto atual,
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
  const [preparando, setPreparando] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const campoRemover = `remover${nome.charAt(0).toUpperCase()}${nome.slice(1)}`;
  const mostrando = previa ?? (removida ? "" : atual ?? "");

  async function escolher(campo: HTMLInputElement) {
    const original = campo.files?.[0];
    setRemovida(false);
    setAviso(null);
    if (!original) {
      setPrevia(null);
      return;
    }

    // enquanto comprime, o formulário não deixa salvar (validação nativa do navegador)
    setPreparando(true);
    campo.setCustomValidity("Aguarde a foto terminar de carregar.");
    const comprimido = await comprimir(original);
    campo.setCustomValidity("");
    setPreparando(false);

    const descartar = (texto: string) => {
      campo.value = "";
      setPrevia(null);
      setAviso({ tipo: "erro", texto });
    };
    if (!comprimido) return descartar("Não consegui abrir essa imagem. Tente uma foto JPG, PNG ou WebP.");
    if (comprimido.size > LIMITE_ENVIO) {
      return descartar(`Mesmo reduzida, a foto ficou com ${tamanho(comprimido.size)} (o máximo é 4 MB). Tente outra.`);
    }

    // troca o arquivo do campo pelo comprimido: é ele que vai no envio do formulário
    const lista = new DataTransfer();
    lista.items.add(comprimido);
    campo.files = lista.files;
    setPrevia(URL.createObjectURL(comprimido));
    if (original.size > comprimido.size * 1.2) {
      setAviso({ tipo: "ok", texto: `Foto reduzida de ${tamanho(original.size)} pra ${tamanho(comprimido.size)}.` });
    }
  }

  return (
    <div>
      <p className="rotulo">{rotulo}</p>
      <div className="flex flex-wrap items-end gap-4">
        <Foto src={mostrando} alt={rotulo} className={`${className} rounded-xl border border-borda`} />
        <div className="flex flex-col gap-2">
          <label className={`btn-secundario cursor-pointer ${preparando ? "opacity-60" : ""}`}>
            <IconeCamera className="size-4" />
            {preparando ? "Preparando foto..." : mostrando ? "Trocar foto" : "Enviar foto"}
            <input
              type="file"
              name={nome}
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={(e) => escolher(e.currentTarget)}
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
      {aviso && (
        <p
          role={aviso.tipo === "erro" ? "alert" : "status"}
          className={`mt-2 text-xs ${aviso.tipo === "erro" ? "text-perigo" : "text-texto-suave"}`}
        >
          {aviso.texto}
        </p>
      )}
      {dica && <p className="mt-2 text-xs text-texto-suave">{dica}</p>}
    </div>
  );
}
