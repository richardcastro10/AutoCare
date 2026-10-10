// Testes de ponta a ponta da conta do cliente (pasta e2e/).
// Rodam contra o build de produção (`npm run build` antes) numa CÓPIA do banco
// (prisma/e2e.db), pra nunca sujar o banco de verdade.
// Rodar: npm run build && npm run test:e2e
import { defineConfig, devices } from "@playwright/test";

const PORTA = 3200;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1, // SQLite: um teste por vez
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
  webServer: {
    // prepara a cópia do banco e só então sobe o servidor apontando pra ela
    command: `node e2e/preparar-banco.mjs && npx next start -p ${PORTA}`,
    url: `http://localhost:${PORTA}/conta/entrar`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: { DATABASE_URL: "file:./prisma/e2e.db" },
  },
});
