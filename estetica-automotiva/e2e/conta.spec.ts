// Conta do cliente (celular + senha). Rodar: npm run build && npm run test:e2e
import fs from "node:fs";
import { expect, test, type Browser, type Page } from "@playwright/test";

const SENHA = "senha-boa-123";
const BALCAO = { telefone: "11900000001", modelo: "Fusca do Balcão", codigo: "BALCAO01" };

// celular novo a cada teste (o banco de teste é recriado a cada rodada, mas assim um teste não pisa no outro)
let sequencia = 0;
function celularNovo() {
  sequencia += 1;
  return `119${String(Date.now()).slice(-6)}${String(sequencia).padStart(2, "0")}`;
}
const mascara = (c: string) => `(${c.slice(0, 2)}) ${c.slice(2, 7)}-${c.slice(7)}`;

async function preencherConta(page: Page, nome: string, celular: string, senha = SENHA) {
  await page.getByLabel("Seu nome").fill(nome);
  await page.getByLabel("Celular (WhatsApp)").fill(celular);
  await page.getByLabel("Senha (mínimo 8 caracteres)").fill(senha);
  await page.getByLabel("Confirme a senha").fill(senha);
  await page.getByRole("button", { name: "Criar conta", exact: true }).click();
}

async function criarConta(page: Page, nome: string, celular: string, voltar = "/conta") {
  await page.goto(`/conta/criar?voltar=${encodeURIComponent(voltar)}`);
  await preencherConta(page, nome, celular);
  await page.waitForURL((url) => url.pathname === voltar);
}

async function entrar(page: Page, celular: string, senha: string) {
  await page.getByLabel("Celular (WhatsApp)").fill(celular);
  await page.getByLabel("Senha", { exact: true }).fill(senha);
  // espera a resposta da action: a mensagem de erro pode ser igual à da tentativa anterior
  await Promise.all([
    page.waitForResponse((r) => r.request().method() === "POST"),
    page.getByRole("button", { name: "Entrar", exact: true }).click(),
  ]);
}

/** Mensagem de erro do formulário (o Next também tem um role="alert" vazio, o anunciador de rotas) */
const erro = (page: Page) => page.locator('p[role="alert"]');

async function sair(page: Page) {
  await page.goto("/conta");
  await page.getByRole("button", { name: "Sair deste aparelho" }).click();
  await page.waitForURL((url) => url.pathname === "/");
}

/** Escolhe serviço, veículo, dia e horário na primeira loja do app e para na confirmação */
async function escolherHorario(page: Page, modelo: string) {
  await page.goto("/");
  await page.locator('a[href^="/loja/"]').first().click();
  await page.locator('a[href*="/servico/"]').first().click();
  await page.getByRole("link", { name: "Selecionar este serviço" }).click();

  await page.getByLabel("Modelo").fill(modelo);
  await page.getByLabel("Placa").fill("TST1A23");
  await page.getByRole("button", { name: "Continuar" }).click();

  // primeiro dia com horário livre
  const horarios = page.getByRole("button", { name: /^\d{2}:\d{2}$/ });
  for (let tentativa = 0; tentativa < 15; tentativa++) {
    await expect(horarios.first().or(page.getByText("Sem horário livre nesse dia."))).toBeVisible();
    if (await horarios.count()) break;
    await page.locator('button[aria-label^="Dia "]:not([disabled])[aria-pressed="false"]').first().click();
  }
  const hora = (await horarios.first().textContent())!.trim();
  await horarios.first().click();
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.getByRole("heading", { name: "Confirme seu agendamento" })).toBeVisible();
  return hora;
}

/** Cliente já logado agenda e devolve o código do agendamento */
async function agendarLogado(page: Page, modelo: string) {
  await escolherHorario(page, modelo);
  await page.getByRole("button", { name: "Confirmar agendamento" }).click();
  await page.waitForURL(/\/agendamento\/[A-Z0-9]+/);
  return new URL(page.url()).pathname.split("/").pop()!;
}

async function novoAparelho(browser: Browser) {
  const contexto = await browser.newContext();
  return contexto.newPage();
}

test("criar conta, sair e entrar de novo", async ({ page }) => {
  const celular = celularNovo();
  await criarConta(page, "Ana Teste", celular);
  await expect(page.getByRole("heading", { name: "Minha conta" })).toBeVisible();
  await expect(page.getByLabel("Nome", { exact: true })).toHaveValue("Ana Teste");
  await expect(page.getByRole("link", { name: "Minha conta" })).toBeVisible();

  await sair(page);
  await expect(page.getByRole("link", { name: "Entrar" })).toBeVisible();

  // rota protegida manda pro login com voltar=
  await page.goto("/conta");
  await expect(page).toHaveURL(/\/conta\/entrar\?voltar=%2Fconta/);
  await entrar(page, mascara(celular), SENHA);
  await expect(page).toHaveURL(/\/conta$/);
  await expect(page.getByLabel("Nome", { exact: true })).toHaveValue("Ana Teste");

  // voltar só aceita caminho interno
  await sair(page);
  await page.goto("/conta/entrar?voltar=//exemplo.com/roubar");
  await entrar(page, celular, SENHA);
  await expect(page).toHaveURL(/localhost:3200\/meus-agendamentos$/);

  // celular que já tem conta
  await sair(page);
  await page.goto("/conta/criar");
  await preencherConta(page, "Outra Pessoa", celular);
  await expect(page.getByText("Esse celular já tem conta.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Entrar?" })).toBeVisible();
});

test("5 senhas erradas bloqueiam o login por 15 minutos", async ({ page }) => {
  const celular = celularNovo();
  await criarConta(page, "Bruno Teste", celular);
  await sair(page);

  await page.goto("/conta/entrar");
  for (let i = 1; i <= 4; i++) {
    await entrar(page, celular, `errada-${i}-xyz`);
    await expect(erro(page)).toHaveText("Celular ou senha incorretos.");
  }
  await entrar(page, celular, "errada-5-xyz");
  await expect(erro(page)).toContainText("bloqueado por 15 minutos");

  // nem a senha certa entra durante o bloqueio
  await entrar(page, celular, SENHA);
  await expect(erro(page)).toContainText("bloqueado");
  await expect(page).toHaveURL(/\/conta\/entrar/);

  // celular sem conta: mesma mensagem genérica (não entrega quem tem cadastro)
  await entrar(page, celularNovo(), SENHA);
  await expect(erro(page)).toHaveText("Celular ou senha incorretos.");
});

test("agendar sem login: a conta é pedida na confirmação e a escolha não se perde", async ({ page }) => {
  const hora = await escolherHorario(page, "Gol Escolhido");

  const resumo = page.locator("dl");
  await expect(resumo).toContainText(hora);
  await expect(resumo).toContainText("Gol Escolhido");
  await expect(page.getByText("Entre pra confirmar")).toBeVisible();
  await expect(page.getByRole("button", { name: "Confirmar agendamento" })).toBeDisabled();

  const celular = celularNovo();
  await preencherConta(page, "Carla Teste", celular);
  await expect(page.getByText("Agendando como")).toContainText("Carla Teste");
  // continua na mesma tela, com as mesmas escolhas
  await expect(resumo).toContainText(hora);
  await expect(resumo).toContainText("Gol Escolhido");

  await page.getByRole("button", { name: "Confirmar agendamento" }).click();
  await page.waitForURL(/\/agendamento\/[A-Z0-9]+\?novo=1/);
  await expect(page.getByText("Horário reservado!")).toBeVisible();
  const codigo = new URL(page.url()).pathname.split("/").pop()!;

  await page.goto("/meus-agendamentos");
  await expect(page.locator(`a[href="/agendamento/${codigo}"]`)).toBeVisible();
  // o veículo ficou salvo na conta
  await page.goto("/conta");
  await expect(page.getByText("Gol Escolhido")).toBeVisible();
});

test("duas contas não veem os agendamentos uma da outra", async ({ page, browser }) => {
  await criarConta(page, "Dani Teste", celularNovo());
  const codigoA = await agendarLogado(page, "Carro da Dani");

  const outra = await novoAparelho(browser);
  await criarConta(outra, "Edu Teste", celularNovo());
  const codigoB = await agendarLogado(outra, "Carro do Edu");

  await page.goto("/meus-agendamentos");
  await expect(page.locator(`a[href="/agendamento/${codigoA}"]`)).toBeVisible();
  await expect(page.locator(`a[href="/agendamento/${codigoB}"]`)).toHaveCount(0);

  await outra.goto("/meus-agendamentos");
  await expect(outra.locator(`a[href="/agendamento/${codigoB}"]`)).toBeVisible();
  await expect(outra.locator(`a[href="/agendamento/${codigoA}"]`)).toHaveCount(0);
  await outra.goto("/conta");
  await expect(outra.getByText("Carro da Dani")).toHaveCount(0);
});

test("agendamento e veículo de balcão não aparecem na conta", async ({ page }) => {
  // o celular já existe como cliente de balcão (sem senha): a conta usa o mesmo registro
  await criarConta(page, "Cliente do Balcão", BALCAO.telefone, "/meus-agendamentos");
  await expect(page.getByText("Nada marcado.")).toBeVisible();
  await expect(page.locator(`a[href="/agendamento/${BALCAO.codigo}"]`)).toHaveCount(0);

  await page.goto("/conta");
  await expect(page.getByText(BALCAO.modelo)).toHaveCount(0);

  // pelo link dá pra ver, mas cancelar é com a loja
  await page.goto(`/agendamento/${BALCAO.codigo}`);
  await expect(page.getByText(BALCAO.modelo)).toBeVisible();
  await expect(page.getByRole("button", { name: "Cancelar agendamento" })).toHaveCount(0);
});

test("outro cliente não consegue cancelar pelo link", async ({ page, browser }) => {
  await criarConta(page, "Fábio Teste", celularNovo());
  const codigo = await agendarLogado(page, "Carro do Fábio");

  // outra conta abre o link: vê, mas não tem o botão
  const intrusa = await novoAparelho(browser);
  await criarConta(intrusa, "Gabi Teste", celularNovo());
  await intrusa.goto(`/agendamento/${codigo}`);
  await expect(intrusa.getByText("Carro do Fábio")).toBeVisible();
  await expect(intrusa.getByRole("button", { name: "Cancelar agendamento" })).toHaveCount(0);
  await expect(intrusa.getByText("que fez este agendamento")).toBeVisible();

  // e mesmo chamando a server action direto (sem a tela), o servidor recusa
  const manifesto = JSON.parse(fs.readFileSync(".next/server/server-reference-manifest.json", "utf8")).node;
  const idCancelar = Object.entries(manifesto).find(
    ([, v]) => (v as { exportedName: string }).exportedName === "cancelarAgendamento",
  )![0];
  const resposta = await intrusa.request.post(`/agendamento/${codigo}`, {
    headers: { "next-action": idCancelar, "content-type": "text/plain;charset=UTF-8", accept: "text/x-component" },
    data: JSON.stringify([codigo]),
  });
  expect(resposta.status()).toBeLessThan(500);
  await page.goto(`/agendamento/${codigo}`);
  await expect(page.getByText("Cancelado", { exact: true })).toHaveCount(0);

  // a própria dona consegue (prova que a chamada acima era válida)
  await page.getByRole("button", { name: "Cancelar agendamento" }).click();
  await page.getByRole("button", { name: "Sim, cancelar" }).click();
  await expect(page.getByText("Cancelado", { exact: true })).toBeVisible();
});

test("esqueci a senha: senha temporária pelo painel da plataforma", async ({ page, browser }) => {
  const celular = celularNovo();
  await criarConta(page, "Helena Teste", celular);

  // tela de login mostra o caminho: falar com a loja (link wa.me)
  const outroAparelho = await novoAparelho(browser);
  await outroAparelho.goto("/conta/entrar");
  await outroAparelho.getByText("Esqueci a senha").click();
  await expect(outroAparelho.getByText("Fale com a loja onde você agendou.")).toBeVisible();
  await expect(outroAparelho.locator('a[href^="https://wa.me/"]').first()).toBeVisible();

  // plataforma gera a senha temporária
  const plataforma = await novoAparelho(browser);
  await plataforma.goto("/plataforma/login");
  await plataforma.getByLabel("E-mail").fill("dono@autocare.com");
  await plataforma.getByLabel("Senha").fill("admin123");
  await plataforma.getByRole("button", { name: "Entrar" }).click();
  await plataforma.waitForURL(/\/plataforma$/);
  await plataforma.goto("/plataforma/clientes");
  await plataforma.getByLabel("Celular do cliente").fill(mascara(celular));
  await plataforma.getByRole("button", { name: "Buscar" }).click();
  await expect(plataforma.getByText("Helena Teste")).toBeVisible();
  plataforma.on("dialog", (d) => d.accept());
  await plataforma.getByRole("button", { name: "Gerar senha temporária" }).click();
  const temporaria = (await plataforma.getByTestId("senha-temporaria").textContent())!.trim();
  expect(temporaria).toMatch(/^[A-Za-z0-9]{10}$/);
  // aparece uma vez só: recarregou, sumiu
  await plataforma.reload();
  await expect(plataforma.getByTestId("senha-temporaria")).toHaveCount(0);

  // a sessão que estava aberta caiu
  await page.goto("/conta");
  await expect(page).toHaveURL(/\/conta\/entrar/);

  // senha antiga não vale mais
  await entrar(page, celular, SENHA);
  await expect(erro(page)).toHaveText("Celular ou senha incorretos.");

  // entra com a temporária e é obrigado a trocar antes de seguir
  await entrar(page, celular, temporaria);
  await expect(page).toHaveURL(/\/conta\/nova-senha/);
  await page.goto("/meus-agendamentos");
  await expect(page).toHaveURL(/\/conta\/nova-senha/);
  const nova = "senha-nova-456";
  await page.getByLabel("Senha nova (mínimo 8 caracteres)").fill(nova);
  await page.getByLabel("Confirme a senha nova").fill(nova);
  await page.getByRole("button", { name: "Salvar senha nova" }).click();
  await expect(page).toHaveURL(/\/meus-agendamentos$/);

  // a nova vale, a temporária não
  await sair(page);
  await page.goto("/conta/entrar");
  await entrar(page, celular, temporaria);
  await expect(erro(page)).toHaveText("Celular ou senha incorretos.");
  await entrar(page, celular, nova);
  await expect(page).toHaveURL(/\/meus-agendamentos$/);
});
