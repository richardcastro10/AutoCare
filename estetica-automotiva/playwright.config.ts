// Testes de ponta a ponta (pasta e2e/), rodando no build de PRODUÇÃO.
//
// npm run test:e2e      banco Postgres LOCAL próprio (estetica_e2e), recriado do zero a cada rodada.
//                       Pré-requisito: Postgres local no ar (docker compose up -d).
// npm run test:e2e:dev  branch DEV do Neon (banco e bucket do .env). Não zera nada: roda só o
//                       teste das fotos (04-), que remove no fim tudo o que enviou.
// O Neon de produção nunca é tocado.
import { defineConfig, devices } from "@playwright/test";
import { ALVO_DEV, AMBIENTE_E2E } from "./e2e/dados";

const PORTA = 3200;

export default defineConfig({
  testDir: "./e2e",
  // na dev, só o teste das fotos (os outros dependem de um banco zerado)
  testMatch: ALVO_DEV ? /04-fotos\.spec\.ts$/ : undefined,
  fullyParallel: false,
  workers: 1, // os arquivos rodam em ordem (01-, 02-, 03-): o 01 confere o painel com o banco zerado
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORTA}`,
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    trace: "retain-on-failure",
  },
  projects: [{ name: "celular", use: { ...devices["Pixel 7"] } }],
  webServer: ALVO_DEV
    ? {
        // build + npm start com o .env (branch dev): banco e bucket da dev
        command: `npx next build && npx next start -p ${PORTA}`,
        url: `http://localhost:${PORTA}/conta/entrar`,
        reuseExistingServer: false,
        timeout: 300_000,
      }
    : {
        // 1) zera o banco de teste e roda migrations + db:seed:molinari
        // 2) build de produção apontando pra ele (a lista de lojas é pré-renderizada no build)
        // 3) npm start
        command: `node e2e/preparar-banco.mjs && npx next build && npx next start -p ${PORTA}`,
        url: `http://localhost:${PORTA}/conta/entrar`,
        reuseExistingServer: false,
        timeout: 300_000,
        env: AMBIENTE_E2E,
      },
});
