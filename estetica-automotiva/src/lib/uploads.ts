// Upload de imagens (foto de serviço, capa e logo da loja).
//
// Onde as fotos ficam:
// - Com as variáveis NEON_S3_* (produção e a branch dev do Neon): no Neon Object Storage,
//   que fala o protocolo do S3, no bucket NEON_S3_BUCKET (público pra leitura). No banco fica a
//   URL pública completa: <NEON_S3_ENDPOINT>/<bucket>/<uuid>.webp
// - Sem elas (seu PC sem Neon): na pasta ./uploads (fora do public/), servida pela rota
//   src/app/arquivos/[nome]/route.ts. Na Vercel não dá pra usar isso: o disco não é guardado.
//
// Em todos os casos a foto chega já comprimida pelo navegador (components/admin/campo-imagem.tsx)
// e aqui é redimensionada de novo e convertida pra WebP com sharp.
// As variáveis usam o prefixo NEON_S3_ (e não AWS_) porque a Vercel reserva os nomes AWS_*.
import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import sharp from "sharp";

export const PASTA_UPLOADS = path.join(process.cwd(), "uploads");

/**
 * Envio de fotos pelo painel ligado? Variável UPLOADS_HABILITADOS ("true" / "false").
 * Sem a variável: ligado no seu PC (npm run dev) e desligado em produção.
 * Desligado: o painel esconde os campos de foto e as actions ignoram qualquer arquivo
 * (as fotos já salvas e as colunas do banco continuam).
 */
export function uploadsHabilitados() {
  const valor = process.env.UPLOADS_HABILITADOS;
  if (valor !== undefined && valor !== "") return valor === "true";
  return process.env.NODE_ENV !== "production";
}

const TIPOS_ACEITOS = ["image/jpeg", "image/png", "image/webp"];
// O navegador já manda a foto com menos de 1,5 MB; o limite do corpo da action é 4 MB
// (next.config.ts) e o da Vercel, 4,5 MB.
const TAMANHO_MAXIMO = 4 * 1024 * 1024;

// ---------- Neon Object Storage (S3) ----------

type ConfigS3 = { endpoint: string; region: string; accessKeyId: string; secretAccessKey: string; bucket: string };

/** As 5 variáveis NEON_S3_* preenchidas? Senão, as fotos vão pra ./uploads */
function configS3(): ConfigS3 | null {
  const endpoint = process.env.NEON_S3_ENDPOINT?.trim().replace(/\/+$/, "");
  const region = process.env.NEON_S3_REGION?.trim();
  const accessKeyId = process.env.NEON_S3_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.NEON_S3_SECRET_ACCESS_KEY?.trim();
  const bucket = process.env.NEON_S3_BUCKET?.trim();
  if (!endpoint || !region || !accessKeyId || !secretAccessKey || !bucket) return null;
  return { endpoint, region, accessKeyId, secretAccessKey, bucket };
}

let clienteS3: { chave: string; cliente: S3Client } | undefined;

function s3(config: ConfigS3) {
  const chave = `${config.endpoint}|${config.accessKeyId}`;
  if (clienteS3?.chave !== chave) {
    clienteS3 = {
      chave,
      cliente: new S3Client({
        endpoint: config.endpoint,
        region: config.region,
        // credenciais explícitas: nada de procurar AWS_* no ambiente
        credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
        // o Neon usa o bucket no caminho (endpoint/bucket/arquivo), não no subdomínio
        forcePathStyle: true,
        // os SDKs recentes calculam checksum de tudo por padrão; o Neon pede só quando necessário
        requestChecksumCalculation: "WHEN_REQUIRED",
        responseChecksumValidation: "WHEN_REQUIRED",
      }),
    };
  }
  return clienteS3.cliente;
}

/** Endereço público de um arquivo do bucket (o bucket é public read) */
const urlPublica = (config: ConfigS3, nome: string) => `${config.endpoint}/${config.bucket}/${nome}`;

// ---------- Salvar e apagar ----------

export type ResultadoUpload = { url: string } | { erro: string } | null;

/**
 * Salva a imagem enviada num <input type="file">. Retorna null se nada foi enviado.
 * A imagem é redimensionada e convertida pra WebP (fica bem mais leve) e ganha um nome único.
 */
export async function salvarImagem(arquivo: FormDataEntryValue | null, larguraMaxima = 1400): Promise<ResultadoUpload> {
  if (!(arquivo instanceof File) || arquivo.size === 0) return null;
  if (!TIPOS_ACEITOS.includes(arquivo.type)) return { erro: "Envie uma imagem JPG, PNG ou WebP." };
  if (arquivo.size > TAMANHO_MAXIMO) return { erro: "A foto ficou grande demais (máximo de 4 MB). Tente outra." };

  let webp: Buffer;
  try {
    webp = await sharp(Buffer.from(await arquivo.arrayBuffer()))
      .rotate() // respeita a orientação da foto do celular
      .resize({ width: larguraMaxima, withoutEnlargement: true })
      .webp({ quality: 80 }) // mantém a transparência (logo em PNG)
      .toBuffer();
  } catch {
    return { erro: "Não consegui ler essa imagem. Envie uma foto JPG, PNG ou WebP." };
  }
  const nome = `${randomUUID()}.webp`;

  const config = configS3();
  if (config) {
    try {
      await s3(config).send(
        new PutObjectCommand({
          Bucket: config.bucket,
          Key: nome,
          Body: webp,
          ContentType: "image/webp",
          // o nome nunca se repete (uuid), então o navegador pode guardar pra sempre
          CacheControl: "public, max-age=31536000, immutable",
        }),
      );
    } catch (e) {
      console.error("[uploads] falha ao enviar pro Neon Object Storage:", e);
      return { erro: "Não foi possível salvar a foto agora. Tente de novo em instantes." };
    }
    return { url: urlPublica(config, nome) };
  }

  await mkdir(PASTA_UPLOADS, { recursive: true });
  await writeFile(path.join(PASTA_UPLOADS, nome), webp);
  return { url: `/arquivos/${nome}` };
}

/**
 * Apaga uma foto antiga (quando é trocada ou removida). Só mexe no que foi enviado pelo
 * painel (bucket ou ./uploads): a logo fixa em /lojas/... nunca é apagada.
 * Se apagar falhar, só registra no log: a tela do dono não pode quebrar por isso.
 */
export async function removerImagem(url: string) {
  const nome = url.split("/").pop() ?? "";
  if (!/^[\w-]+\.webp$/.test(nome)) return;

  const config = configS3();
  if (config && url === urlPublica(config, nome)) {
    try {
      await s3(config).send(new DeleteObjectCommand({ Bucket: config.bucket, Key: nome }));
    } catch (e) {
      console.error(`[uploads] não consegui apagar ${nome} do bucket (a foto antiga ficou lá):`, e);
    }
    return;
  }
  if (url === `/arquivos/${nome}`) {
    await unlink(path.join(PASTA_UPLOADS, nome)).catch((e) => {
      if (e?.code !== "ENOENT") console.error(`[uploads] não consegui apagar ${nome} de ./uploads:`, e);
    });
  }
}
