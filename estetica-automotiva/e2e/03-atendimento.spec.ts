// Fluxo completo de uma implantação nova: cliente cria conta e agenda, o dono atende pelo
// painel até concluir (serviço sem ficha técnica: não mexe no estoque), e rodar o
// db:seed:molinari de novo não apaga nem duplica nada.
import { execSync } from "node:child_process";
import pg from "pg";
import { expect, test } from "@playwright/test";
import { AMBIENTE_E2E, DONO, URL_BANCO_E2E } from "./dados";

async function consultar<T extends Record<string, unknown>>(sql: string, valores: unknown[] = []) {
  const banco = new pg.Client({ connectionString: URL_BANCO_E2E });
  await banco.connect();
  try {
    return (await banco.query(sql, valores)).rows as T[];
  } finally {
    await banco.end();
  }
}

const contagens = async () =>
  (
    await consultar<Record<string, string>>(`select
      (select count(*) from "Loja") lojas,
      (select count(*) from "HorarioFuncionamento") horarios,
      (select count(*) from "Servico") servicos,
      (select count(*) from "PrecoServico") precos,
      (select count(*) from "ServicoInsumo") insumos,
      (select count(*) from "Produto") produtos,
      (select count(*) from "MovimentoEstoque") movimentos,
      (select count(*) from "Usuario") usuarios,
      (select count(*) from "AdminPlataforma") admins,
      (select count(*) from "Cliente") clientes,
      (select count(*) from "Agendamento") agendamentos`)
  )[0];

test("cliente agenda, dono conclui sem ficha técnica e o seed de novo não duplica nada", async ({ page, browser }) => {
  // ---- cliente: cria conta e agenda ----
  const celular = `119${String(Date.now()).slice(-8)}`;
  await page.goto("/conta/criar?voltar=%2F");
  await page.getByLabel("Seu nome").fill("Cliente Atendimento");
  await page.getByLabel("Celular (WhatsApp)").fill(celular);
  await page.getByLabel("Senha (mínimo 8 caracteres)").fill("senha-cliente-1");
  await page.getByLabel("Confirme a senha").fill("senha-cliente-1");
  await page.getByRole("button", { name: "Criar conta", exact: true }).click();
  await page.waitForURL((u) => u.pathname === "/");

  await page.locator('a[href="/loja/molinari"]').first().click();
  await page.locator('a[href*="/servico/"]').filter({ hasText: "Lavagem premium" }).first().click();
  await page.getByRole("link", { name: "Selecionar este serviço" }).click();
  await page.getByLabel("Modelo").fill("Onix Atendimento");
  await page.getByLabel("Placa").fill("ATD1A23");
  await page.getByRole("button", { name: "Continuar" }).click();
  const horarios = page.getByRole("button", { name: /^\d{2}:\d{2}$/ });
  for (let i = 0; i < 15; i++) {
    await expect(horarios.first().or(page.getByText("Sem horário livre nesse dia."))).toBeVisible();
    if (await horarios.count()) break;
    await page.locator('button[aria-label^="Dia "]:not([disabled])[aria-pressed="false"]').first().click();
  }
  await horarios.first().click();
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.getByText("Agendando como")).toContainText("Cliente Atendimento");
  await page.getByRole("button", { name: "Confirmar agendamento" }).click();
  await page.waitForURL(/\/agendamento\/[A-Z0-9]+\?novo=1/);
  const codigo = new URL(page.url()).pathname.split("/").pop()!;
  const [{ id }] = await consultar<{ id: number }>(`select id from "Agendamento" where codigo = $1`, [codigo]);

  // ---- dono: atende pelo painel até concluir ----
  const painel = await (await browser.newContext({ viewport: { width: 1366, height: 900 } })).newPage();
  await painel.goto("/admin/login");
  await painel.getByLabel("E-mail").fill(DONO.email);
  await painel.getByLabel("Senha").fill(DONO.senha);
  await painel.getByRole("button", { name: "Entrar" }).click();
  await painel.waitForURL(/\/admin$/);

  await painel.goto(`/admin/agendamentos/${id}`);
  await expect(painel.getByText("Onix Atendimento").first()).toBeVisible();
  await painel.getByRole("button", { name: "Confirmar", exact: true }).click();
  await painel.getByRole("button", { name: "Iniciar lavagem" }).click();
  await expect(painel.getByText("Concluir e registrar pagamento")).toBeVisible();
  await painel.screenshot({ path: "test-results/telas/admin-concluir-sem-ficha.png", fullPage: true });
  await painel.getByRole("button", { name: "Concluir serviço" }).click();
  await expect(painel.getByText("Concluído").first()).toBeVisible();

  const [concluido] = await consultar<{ status: string; valorPago: number | null }>(
    `select status, "valorPago" from "Agendamento" where id = $1`,
    [id],
  );
  expect(concluido.status).toBe("CONCLUIDO");
  expect(concluido.valorPago).toBeGreaterThan(0);
  const antes = await contagens();
  expect(antes.movimentos).toBe("0"); // sem ficha técnica: o estoque não foi mexido

  // dashboard e relatórios com dado de verdade continuam abrindo
  for (const tela of ["/admin", "/admin/financeiro", "/admin/relatorios"]) {
    await painel.goto(tela);
    await expect(painel.locator("body")).not.toContainText("NaN");
  }

  // ---- db:seed:molinari de novo: nada some, nada duplica ----
  const saida = execSync("npx tsx prisma/seed-molinari.ts", { env: { ...process.env, ...AMBIENTE_E2E } }).toString();
  expect(saida).toContain("já existia");
  const depois = await contagens();
  expect(depois).toEqual(antes);
  expect(depois).toMatchObject({ lojas: "1", horarios: "7", servicos: "7", precos: "26", insumos: "0", produtos: "0", admins: "1" });
  const [{ status }] = await consultar<{ status: string }>(`select status from "Agendamento" where codigo = $1`, [codigo]);
  expect(status).toBe("CONCLUIDO");

  // e o cliente continua vendo o agendamento na conta
  await page.goto("/meus-agendamentos");
  await expect(page.locator(`a[href="/agendamento/${codigo}"]`)).toBeVisible();
});
