// Antes dos testes: recria do ZERO o banco de teste (estetica_e2e), aplica as migrations e
// roda o db:seed:molinari, igual a uma implantação nova. Só aceita banco local de teste.
import { execSync } from "node:child_process";
import pg from "pg";

const url = process.env.DATABASE_URL ?? "";
if (!/@(localhost|127\.0\.0\.1)[:/]/.test(url) || !/e2e/.test(url)) {
  console.error(`Recusado: os testes só apagam um banco LOCAL com "e2e" no nome (recebi ${url.replace(/:[^:@/]*@/, ":***@")}).`);
  process.exit(1);
}

const cliente = new pg.Client({ connectionString: url });
await cliente.connect();
await cliente.query("DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;");
await cliente.end();

const ambiente = { ...process.env, DIRECT_URL: url };
execSync("npx prisma migrate deploy", { env: ambiente, stdio: "inherit" });
execSync("npx tsx prisma/seed-molinari.ts", { env: ambiente, stdio: "inherit" });
console.log("estetica_e2e pronto: migrations + db:seed:molinari, sem nenhum agendamento");
