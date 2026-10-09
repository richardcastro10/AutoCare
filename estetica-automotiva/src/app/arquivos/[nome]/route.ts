// Serve as imagens enviadas pelo painel (pasta /uploads).
import { readFile } from "node:fs/promises";
import path from "node:path";
import { PASTA_UPLOADS } from "@/lib/uploads";

export async function GET(_request: Request, { params }: RouteContext<"/arquivos/[nome]">) {
  const { nome } = await params;
  // só aceita nomes gerados por nós (uuid.webp): impede ler outros arquivos do servidor
  if (!/^[\w-]+\.webp$/.test(nome)) return new Response("Não encontrado", { status: 404 });

  try {
    const arquivo = await readFile(path.join(PASTA_UPLOADS, nome));
    return new Response(arquivo, {
      headers: {
        "Content-Type": "image/webp",
        // o nome é único (uuid), então pode guardar em cache "pra sempre"
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Não encontrado", { status: 404 });
  }
}
