// Converte a logo de uma loja pra WebP leve e guarda em public/lojas/<slug>-logo.webp.
//
//   npm run logo:loja -- molinari                      (usa public/lojas/molinari-logo.png)
//   npm run logo:loja -- molinari C:\caminho\logo.png  (qualquer PNG/JPG/WebP)
//
// Altura máxima de 256 px (nunca aumenta), mantém a transparência e apaga o PNG de
// public/lojas depois de converter. Depois, a logoUrl da loja no banco tem que ser
// "/lojas/<slug>-logo.webp" (o db:seed:molinari já faz isso pra Molinari).
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const [slug, origemInformada] = process.argv.slice(2);
if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
  console.error("Uso: npm run logo:loja -- <slug-da-loja> [arquivo-da-logo]");
  process.exit(1);
}

const pasta = path.join("public", "lojas");
const origem = origemInformada ?? path.join(pasta, `${slug}-logo.png`);
const destino = path.join(pasta, `${slug}-logo.webp`);
if (!fs.existsSync(origem)) {
  console.error(`Não achei a logo em ${origem}. Coloque o arquivo lá ou passe o caminho dele.`);
  process.exit(1);
}

fs.mkdirSync(pasta, { recursive: true });
const info = await sharp(origem)
  .resize({ height: 256, withoutEnlargement: true })
  .webp({ quality: 90, alphaQuality: 100 }) // alphaQuality: transparência sem serrilhado
  .toFile(destino);

// o PNG que estava em public/lojas não precisa ir pro ar
const pngNoPublic = path.resolve(origem).startsWith(path.resolve(pasta)) && origem.toLowerCase().endsWith(".png");
if (pngNoPublic) fs.rmSync(origem);

console.log(`✓ ${destino}: ${info.width}x${info.height}, ${(info.size / 1024).toFixed(1)} KB${pngNoPublic ? ` (apagado ${origem})` : ""}`);
console.log(`  logoUrl no banco: /lojas/${slug}-logo.webp`);
