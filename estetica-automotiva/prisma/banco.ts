// PrismaClient dos scripts de banco (seeds e reset). O app usa src/lib/prisma.ts.
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

/** URL que os scripts usam: a direta (sem pooler) quando existir */
export const urlDoBanco = () => process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "";

/** Banco do Neon (nuvem)? Os scripts que apagam dados se recusam a rodar nele. */
export const ehNeon = () => [process.env.DATABASE_URL, process.env.DIRECT_URL].some((u) => u?.includes("neon.tech"));

export function criarPrisma() {
  const connectionString = urlDoBanco();
  if (!connectionString) throw new Error("Defina DATABASE_URL (e DIRECT_URL) no .env (veja o .env.example)");
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

/**
 * Admin da plataforma (/plataforma), sempre das variáveis de ambiente: nenhuma senha fica no código.
 * Devolve a lista de problemas (vazia = tudo certo) e os dados.
 */
export function lerAdminPlataforma() {
  const nome = (process.env.PLATAFORMA_ADMIN_NOME ?? "").trim() || "Admin AutoCare";
  const email = (process.env.PLATAFORMA_ADMIN_EMAIL ?? "").trim().toLowerCase();
  const senha = process.env.PLATAFORMA_ADMIN_SENHA ?? "";
  const problemas: string[] = [];
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) problemas.push("PLATAFORMA_ADMIN_EMAIL: informe um e-mail válido");
  if (senha.length < 8) problemas.push("PLATAFORMA_ADMIN_SENHA: use pelo menos 8 caracteres");
  if (/troque/i.test(senha) || email.endsWith("@exemplo.com")) {
    problemas.push("PLATAFORMA_ADMIN_*: ainda está com o valor de exemplo do .env.example");
  }
  return { problemas, admin: { nome, email, senha } };
}

/** Para o script com uma mensagem clara (sem stack trace) */
export function recusar(motivo: string): never {
  console.error(`\n✖ ${motivo}\n`);
  process.exit(1);
}
