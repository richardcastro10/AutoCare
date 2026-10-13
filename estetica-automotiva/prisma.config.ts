// Configuração do Prisma CLI (migrate, generate, seed, studio).
// O CLI usa DIRECT_URL: conexão DIRETA com o Postgres (no Neon, a URL SEM "-pooler"),
// porque o migrate precisa de recursos que o pooler (PgBouncer) não tem.
// O app em si usa DATABASE_URL (no Neon, a URL COM "-pooler"): veja src/lib/prisma.ts.
// Localmente as duas podem ser iguais (Postgres do docker-compose.yml).
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    // seed de DEMONSTRAÇÃO (4 lojas): se recusa a rodar em produção ou no Neon
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // process.env (e não env()) pra não quebrar o `prisma generate`, que não precisa de banco
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "",
  },
});
