import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

// PostgreSQL via @prisma/adapter-pg (driver "pg", conexão TCP comum).
// - Na Vercel, DATABASE_URL é a connection string POOLED do Neon (host com "-pooler"):
//   cada função abre poucas conexões e o pooler do Neon segura o resto.
// - No seu PC, é o Postgres do docker-compose.yml.
// Escolhemos o adapter-pg (e não o adapter-neon, que fala por WebSocket) porque o mesmo
// código funciona no Neon e num Postgres local, sem nenhum proxy no meio.
//
// Em desenvolvimento o Next recarrega os módulos a cada alteração.
// Guardamos o client no globalThis pra não abrir conexões novas a cada reload.
const globalParaPrisma = globalThis as unknown as { prisma?: PrismaClient };

function criarClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("Defina DATABASE_URL no .env (veja o .env.example)");
  const adapter = new PrismaPg({
    connectionString,
    max: 5, // função serverless: poucas conexões por instância
    idleTimeoutMillis: 10_000,
  });
  return new PrismaClient({ adapter });
}

export const prisma = globalParaPrisma.prisma ?? criarClient();

if (process.env.NODE_ENV !== "production") globalParaPrisma.prisma = prisma;
