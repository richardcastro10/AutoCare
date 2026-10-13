// npm run test:e2e:dev: roda o teste das fotos contra a branch DEV do Neon (banco e bucket do .env).
// Só existe pra ligar E2E_ALVO=dev do mesmo jeito no Windows e no Linux (veja playwright.config.ts).
import { spawnSync } from "node:child_process";

const resultado = spawnSync("npx", ["playwright", "test", ...process.argv.slice(2)], {
  stdio: "inherit",
  shell: true,
  env: { ...process.env, E2E_ALVO: "dev" },
});
process.exit(resultado.status ?? 1);
