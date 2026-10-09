// Upload de imagens (foto de serviço, capa e logo da loja).
// Os arquivos ficam na pasta /uploads (fora do public/) e são servidos pela rota
// src/app/arquivos/[nome]/route.ts. Assim funciona também depois do `next build`
// (o Next só serve arquivos que já estavam no public/ na hora do build).
import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

export const PASTA_UPLOADS = path.join(process.cwd(), "uploads");
const TIPOS_ACEITOS = ["image/jpeg", "image/png", "image/webp"];
const TAMANHO_MAXIMO = 5 * 1024 * 1024; // 5 MB

export type ResultadoUpload = { url: string } | { erro: string } | null;

/**
 * Salva a imagem enviada num <input type="file">. Retorna null se nada foi enviado.
 * A imagem é redimensionada e convertida pra WebP (fica bem mais leve).
 */
export async function salvarImagem(arquivo: FormDataEntryValue | null, larguraMaxima = 1400): Promise<ResultadoUpload> {
  if (!(arquivo instanceof File) || arquivo.size === 0) return null;
  if (!TIPOS_ACEITOS.includes(arquivo.type)) return { erro: "Envie uma imagem JPG, PNG ou WebP." };
  if (arquivo.size > TAMANHO_MAXIMO) return { erro: "A imagem pode ter no máximo 5 MB." };

  const nome = `${randomUUID()}.webp`;
  const buffer = Buffer.from(await arquivo.arrayBuffer());
  const webp = await sharp(buffer)
    .rotate() // respeita a orientação da foto do celular
    .resize({ width: larguraMaxima, withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();

  await mkdir(PASTA_UPLOADS, { recursive: true });
  await writeFile(path.join(PASTA_UPLOADS, nome), webp);
  return { url: `/arquivos/${nome}` };
}

/** Apaga uma imagem antiga (quando é trocada ou removida) */
export async function removerImagem(url: string) {
  const nome = url.replace(/^\/arquivos\//, "");
  if (!/^[\w-]+\.webp$/.test(nome)) return;
  await unlink(path.join(PASTA_UPLOADS, nome)).catch(() => {});
}
