import path from "node:path";
import type { NextConfig } from "next";

// O repositório Git é a pasta de fora e o app fica nesta subpasta (na Vercel: Root Directory =
// estetica-automotiva). Fixar a raiz aqui evita o Next "adivinhar" a pasta de fora por causa do
// package-lock.json vazio que existe lá.
const raiz = path.resolve(".");

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  outputFileTracingRoot: raiz,
  // Fotos de serviço/loja vão por server action, e o limite padrão do corpo é 1 MB.
  // 4 MB fica abaixo do limite da Vercel (4,5 MB por requisição). Na prática a foto chega
  // com menos de 1,5 MB: o navegador reduz antes de enviar (components/admin/campo-imagem.tsx).
  experimental: { serverActions: { bodySizeLimit: "4mb" } },
  turbopack: {
    root: raiz,
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
