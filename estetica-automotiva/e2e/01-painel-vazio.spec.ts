// Implantação nova (só o db:seed:molinari, nenhum agendamento): todas as telas do painel
// da loja e da plataforma abrem sem erro, sem "NaN" e com mensagem amigável.
// Também confere: campos de foto aparecem (UPLOADS_HABILITADOS=true) e as telas ficam bonitas sem foto.
import fs from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { ADMIN, DONO } from "./dados";

const TELAS = "test-results/telas"; // capturas pra conferir o visual
fs.mkdirSync(TELAS, { recursive: true });

async function semErro(page: Page, caminho: string, nome: string) {
  const resposta = await page.goto(caminho);
  expect(resposta?.status(), `${caminho} respondeu ${resposta?.status()}`).toBeLessThan(400);
  await page.waitForLoadState("networkidle");
  const texto = await page.locator("body").innerText();
  expect(texto, `${caminho} mostrou erro`).not.toMatch(/Application error|Something went wrong|Internal Server Error/i);
  expect(texto, `${caminho} mostrou NaN/Infinity`).not.toMatch(/\bNaN\b|Infinity/);
  await page.screenshot({ path: `${TELAS}/${nome}.png`, fullPage: true });
  return texto;
}

test.describe("banco zerado (só o db:seed:molinari)", () => {
  test.use({ viewport: { width: 1366, height: 900 }, isMobile: false, hasTouch: false });

  test("todas as telas do painel da loja", async ({ page }) => {
    await page.goto("/admin/login");
    await page.getByLabel("E-mail").fill(DONO.email);
    await page.getByLabel("Senha").fill(DONO.senha);
    await page.getByRole("button", { name: "Entrar" }).click();
    await page.waitForURL(/\/admin$/);

    // dashboard: gráficos vazios viram mensagem
    let texto = await semErro(page, "/admin", "admin-dashboard");
    expect(texto).toContain("Nenhum faturamento nesse período ainda");
    expect(texto).toContain("Nenhum agendamento hoje.");
    expect(texto).toContain("Nenhum serviço concluído no mês.");
    expect(texto).toContain("Nenhum veículo atendido no mês ainda.");
    await semErro(page, "/admin?periodo=30", "admin-dashboard-30");

    texto = await semErro(page, "/admin/agendamentos", "admin-agendamentos");
    expect(texto).toMatch(/Nenhum agendamento em/);
    await semErro(page, "/admin/agendamentos/novo", "admin-agendamento-novo");

    texto = await semErro(page, "/admin/clientes", "admin-clientes");
    expect(texto).toContain("Nenhum cliente encontrado.");
    await semErro(page, "/admin/clientes?q=ana", "admin-clientes-busca");
    texto = await semErro(page, "/admin/veiculos", "admin-veiculos");
    expect(texto).toContain("Nenhum veículo encontrado.");
    await semErro(page, "/admin/veiculos?q=civic", "admin-veiculos-busca");

    // serviços: os 7 do catálogo padrão, ainda sem foto (com o campo pra enviar)
    texto = await semErro(page, "/admin/servicos", "admin-servicos");
    expect(texto).toContain("Lavagem básica");
    expect(texto).toContain("Vitrificação de pintura");
    await page.locator('a[href^="/admin/servicos/"]').filter({ hasText: "Lavagem premium" }).first().click();
    await page.waitForURL(/\/admin\/servicos\/\d+/);
    await semErro(page, new URL(page.url()).pathname, "admin-servico-editar");
    await expect(page.locator('input[type="file"][name="imagem"]')).toHaveCount(1);
    await semErro(page, "/admin/servicos/novo", "admin-servico-novo");
    await expect(page.getByText("Enviar foto").first()).toBeVisible();

    await semErro(page, "/admin/estoque", "admin-estoque");
    texto = await semErro(page, "/admin/financeiro", "admin-financeiro");
    expect(texto).toContain("Sem recebimentos nesse mês.");
    texto = await semErro(page, "/admin/relatorios", "admin-relatorios");
    expect(texto).toContain("Nenhum serviço concluído nos últimos 90 dias.");

    // CSV sem nenhum serviço: só o cabeçalho
    const csv = await page.request.get("/admin/relatorios/csv");
    expect(csv.status()).toBe(200);
    const conteudo = await csv.text();
    expect(conteudo).toContain("Data");
    expect(conteudo.trim().split("\n")).toHaveLength(1);

    await semErro(page, "/admin/equipe", "admin-equipe");

    // configurações: sem campos de foto; a logo aparece (a fixa, ou o nome em dourado sem ela)
    await semErro(page, "/admin/configuracoes", "admin-configuracoes");
    // envio de fotos ligado: campos de capa e logo
    await expect(page.getByText("Foto da fachada (capa)")).toBeVisible();
    await expect(page.getByText("Logo", { exact: true })).toBeVisible();
    if (fs.existsSync("public/lojas/molinari-logo.webp")) {
      const logo = page.locator('img[src="/lojas/molinari-logo.webp"]').first();
      await expect(logo).toBeVisible();
      expect(await logo.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
    } else {
      // sem logo: o painel mostra o nome da loja em dourado no menu lateral
      await expect(page.locator("aside").getByText("Molinari", { exact: true }).first()).toBeVisible();
    }
  });

  test("painel da plataforma", async ({ page }) => {
    await page.goto("/plataforma/login");
    await page.getByLabel("E-mail").fill(ADMIN.email);
    await page.getByLabel("Senha").fill(ADMIN.senha);
    await page.getByRole("button", { name: "Entrar" }).click();
    await page.waitForURL(/\/plataforma$/);

    const texto = await semErro(page, "/plataforma", "plataforma-lojas");
    expect(texto).toContain("Molinari");
    expect(texto).toContain("Ativa");
    const pendentes = await semErro(page, "/plataforma?status=PENDENTE", "plataforma-pendentes");
    expect(pendentes).toContain("Nenhuma loja encontrada.");
    await page.goto("/plataforma");
    // :visible: o Next 16 mantém escondida na página a tela anterior (com os mesmos links)
    await page.locator('a[href^="/plataforma/lojas/"]:visible').first().click();
    await page.waitForURL(/\/plataforma\/lojas\/\d+/);
    await semErro(page, new URL(page.url()).pathname, "plataforma-loja");
    await semErro(page, "/plataforma/clientes", "plataforma-clientes");
    await semErro(page, "/plataforma/clientes?celular=11999999999", "plataforma-clientes-busca");
  });

  test("app do cliente sem nenhuma foto", async ({ page }) => {
    await semErro(page, "/", "app-inicio");
    await expect(page.getByText("Molinari").first()).toBeVisible();
    await semErro(page, "/loja/molinari", "app-loja");
    await page.locator('a[href*="/servico/"]').first().click();
    await page.waitForURL(/\/servico\/\d+/);
    await semErro(page, new URL(page.url()).pathname, "app-servico");
    // sem foto nenhuma, nenhuma imagem quebrada na tela
    const quebradas = await page.locator("img").evaluateAll((imgs) =>
      (imgs as HTMLImageElement[]).filter((i) => i.complete && i.naturalWidth === 0).length,
    );
    expect(quebradas).toBe(0);
  });
});
