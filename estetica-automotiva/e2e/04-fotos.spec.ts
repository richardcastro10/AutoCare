// Envio de fotos pelo painel (UPLOADS_HABILITADOS=true):
// - foto grande (> 5 MB) num serviço: o navegador reduz, o servidor converte pra WebP e grava no
//   bucket (NEON_S3_*) ou em ./uploads; a URL abre SEM credencial e aparece no app do cliente;
// - trocar a foto apaga a antiga do bucket;
// - logo e capa da loja;
// - no fim, remove tudo o que enviou (e confere que sumiu do bucket), deixando o banco como estava.
import fs from "node:fs";
import pg from "pg";
import sharp from "sharp";
import { expect, test, type Page } from "@playwright/test";
import { DONO, URL_BANCO_E2E } from "./dados";

const PASTA = "test-results/fotos-teste";

async function consultar<T extends Record<string, unknown>>(sql: string, valores: unknown[] = []) {
  const banco = new pg.Client({ connectionString: URL_BANCO_E2E });
  await banco.connect();
  try {
    return (await banco.query(sql, valores)).rows as T[];
  } finally {
    await banco.end();
  }
}

/** URL absoluta (a do bucket já é; a de ./uploads é relativa ao app) */
const absoluta = (url: string, base: string) => (url.startsWith("http") ? url : new URL(url, base).toString());

/** Busca a foto como um visitante qualquer: sem cookie e sem credencial */
async function buscarSemCredencial(url: string) {
  const resposta = await fetch(url, { cache: "no-store" });
  return { status: resposta.status, tipo: resposta.headers.get("content-type"), cache: resposta.headers.get("cache-control") };
}

/**
 * Escolhe a foto e espera ela ser reduzida no navegador (a prévia vira um blob:).
 * Antes, espera a página terminar de carregar: sem o React pronto, a troca de arquivo se perde.
 */
async function escolherFoto(page: Page, campo: string, rotulo: string, arquivo: string) {
  await page.waitForLoadState("networkidle");
  await page.locator(`input[type="file"][name="${campo}"]`).setInputFiles(arquivo);
  await expect(page.locator(`img[alt="${rotulo}"][src^="blob:"]`)).toBeVisible({ timeout: 30_000 });
}

test.beforeAll(async () => {
  fs.mkdirSync(PASTA, { recursive: true });
  // "foto de celular" de 4000x3000 com ruído: o JPEG passa fácil de 5 MB
  const ruido = (media: number) => ({ type: "gaussian" as const, mean: media, sigma: 70 });
  await sharp({ create: { width: 4000, height: 3000, channels: 3, background: "#7a8a96", noise: ruido(120) } })
    .jpeg({ quality: 97 })
    .toFile(`${PASTA}/foto-grande-1.jpg`);
  await sharp({ create: { width: 4000, height: 3000, channels: 3, background: "#4a6a5a", noise: ruido(90) } })
    .jpeg({ quality: 97 })
    .toFile(`${PASTA}/foto-grande-2.jpg`);
  // logo com fundo transparente
  await sharp({ create: { width: 800, height: 400, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: Buffer.from('<svg width="800" height="400"><rect x="100" y="100" width="600" height="200" rx="40" fill="#f2b53a"/></svg>') }])
    .png()
    .toFile(`${PASTA}/logo.png`);
});

test("fotos de serviço, logo e capa vão pro armazenamento e aparecem no app", async ({ page, baseURL }) => {
  test.setTimeout(120_000);
  expect(fs.statSync(`${PASTA}/foto-grande-1.jpg`).size).toBeGreaterThan(5 * 1024 * 1024);

  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto("/admin/login");
  await page.getByLabel("E-mail").fill(DONO.email);
  await page.getByLabel("Senha").fill(DONO.senha);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL(/\/admin$/);

  const [servico] = await consultar<{ id: number; imagemUrl: string }>(
    `select s.id, s."imagemUrl" from "Servico" s join "Loja" l on l.id = s."lojaId"
     where l.slug = 'molinari' and s.nome = 'Lavagem básica'`,
  );
  const fotoDoServico = async () =>
    (await consultar<{ imagemUrl: string }>(`select "imagemUrl" from "Servico" where id = $1`, [servico.id]))[0].imagemUrl;

  // ---- 1. foto grande (> 5 MB) ----
  await page.goto(`/admin/servicos/${servico.id}`);
  await escolherFoto(page, "imagem", "Foto do serviço", `${PASTA}/foto-grande-1.jpg`);
  await expect(page.getByText(/Foto reduzida de .* MB pra .* MB/)).toBeVisible();
  await page.getByRole("button", { name: "Salvar alterações" }).click();
  await expect(page.getByText("Alterações salvas.")).toBeVisible({ timeout: 30_000 });

  const url1 = await fotoDoServico();
  expect(url1).toMatch(/[0-9a-f-]{36}\.webp$/);
  const publica1 = absoluta(url1, baseURL!);
  const aberta = await buscarSemCredencial(publica1);
  expect(aberta.status).toBe(200);
  expect(aberta.tipo).toContain("image/webp");
  if (url1.startsWith("http")) expect(aberta.cache).toContain("immutable"); // bucket: Cache-Control gravado

  // aparece no app do cliente
  await page.goto(`/loja/molinari/servico/${servico.id}`);
  const img = page.locator(`img[src="${url1}"]`).first();
  await expect(img).toBeVisible();
  // a foto vem do bucket (outro servidor) e é lazy: espera terminar de carregar
  await expect
    .poll(() => img.evaluate((i: HTMLImageElement) => (i.complete ? i.naturalWidth : 0)), { timeout: 20_000 })
    .toBeGreaterThan(0);

  // ---- 2. trocar a foto: a antiga some do armazenamento ----
  await page.goto(`/admin/servicos/${servico.id}`);
  await escolherFoto(page, "imagem", "Foto do serviço", `${PASTA}/foto-grande-2.jpg`);
  await page.getByRole("button", { name: "Salvar alterações" }).click();
  await expect(page.getByText("Alterações salvas.")).toBeVisible({ timeout: 30_000 });
  const url2 = await fotoDoServico();
  expect(url2).not.toBe(url1);
  expect((await buscarSemCredencial(absoluta(url2, baseURL!))).status).toBe(200);
  expect([403, 404]).toContain((await buscarSemCredencial(publica1)).status);

  // ---- 3. logo e capa da loja ----
  await page.goto("/admin/configuracoes");
  await escolherFoto(page, "capa", "Foto da fachada (capa)", `${PASTA}/foto-grande-1.jpg`);
  await escolherFoto(page, "logo", "Logo", `${PASTA}/logo.png`);
  await page.getByRole("button", { name: "Salvar dados da loja" }).click();
  await expect(page.getByText("Dados da loja salvos.")).toBeVisible({ timeout: 30_000 });
  const [loja] = await consultar<{ capaUrl: string; logoUrl: string }>(
    `select "capaUrl", "logoUrl" from "Loja" where slug = 'molinari'`,
  );
  for (const url of [loja.capaUrl, loja.logoUrl]) {
    expect(url).toMatch(/\.webp$/);
    expect((await buscarSemCredencial(absoluta(url, baseURL!))).status).toBe(200);
  }
  // logo: a transparência continua (canto da imagem sem cor)
  const logo = Buffer.from(await (await fetch(absoluta(loja.logoUrl, baseURL!))).arrayBuffer());
  expect((await sharp(logo).metadata()).hasAlpha).toBe(true);

  await page.goto("/loja/molinari");
  await expect(page.locator(`img[src="${loja.capaUrl}"]`).first()).toBeVisible();
  await page.goto("/admin");
  await expect(page.locator(`img[src="${loja.logoUrl}"]`).first()).toBeVisible(); // logo no menu do painel
  await page.screenshot({ path: "test-results/telas/admin-com-logo.png" });

  // ---- 4. limpeza: remover as fotos (e conferir que saíram do armazenamento) ----
  // (marcar "Remover foto" esconde a caixa e mostra "Desfazer": por isso click, e não check)
  await page.goto(`/admin/servicos/${servico.id}`);
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Remover foto").click();
  await expect(page.getByRole("button", { name: "Desfazer" })).toBeVisible();
  await page.getByRole("button", { name: "Salvar alterações" }).click();
  await expect(page.getByText("Alterações salvas.")).toBeVisible({ timeout: 30_000 });
  expect(await fotoDoServico()).toBe("");
  expect([403, 404]).toContain((await buscarSemCredencial(absoluta(url2, baseURL!))).status);

  await page.goto("/admin/configuracoes");
  await page.waitForLoadState("networkidle");
  // capa e logo: cada clique esconde a caixa daquele campo
  await page.getByLabel("Remover foto").first().click();
  await page.getByLabel("Remover foto").first().click();
  await expect(page.getByRole("button", { name: "Desfazer" })).toHaveCount(2);
  await page.getByRole("button", { name: "Salvar dados da loja" }).click();
  await expect(page.getByText("Dados da loja salvos.")).toBeVisible({ timeout: 30_000 });
  for (const url of [loja.capaUrl, loja.logoUrl]) {
    expect([403, 404]).toContain((await buscarSemCredencial(absoluta(url, baseURL!))).status);
  }
});
