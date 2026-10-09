import "server-only";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@/generated/prisma/client";

// Em desenvolvimento o Next recarrega os módulos a cada alteração.
// Guardamos o client no globalThis pra não abrir uma conexão nova a cada reload.
const globalParaPrisma = globalThis as unknown as { prisma?: PrismaClient };

function criarClient() {
  const adapter = new PrismaBetterSqlite3({
    url: process.env.DATABASE_URL ?? "file:./prisma/lavagem.db",
  });
  return new PrismaClient({ adapter });
}

export const prisma = globalParaPrisma.prisma ?? criarClient();

if (process.env.NODE_ENV !== "production") globalParaPrisma.prisma = prisma;
