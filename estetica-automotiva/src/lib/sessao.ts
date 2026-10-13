// Sessões guardadas em cookie, assinadas com JWT (biblioteca jose).
// Não tem "server-only" aqui porque o proxy.ts também usa as funções de verificação.
import { SignJWT, jwtVerify } from "jose";

export const COOKIE_ADMIN = "sessao_admin";

const DURACAO_ADMIN_DIAS = 7;

// Valor do .env.example: nunca serve, nem no seu PC
const SEGREDO_DE_EXEMPLO = "troque-esta-chave-por-uma-string-grande-e-aleatoria-123456";

/**
 * Problema com o SESSION_SECRET, ou null se ele estiver bom.
 * Bom = pelo menos 32 caracteres, não é o do exemplo e não é repetitivo ("aaaa...").
 */
export function problemaNoSegredo(segredo = process.env.SESSION_SECRET): string | null {
  if (!segredo) return "SESSION_SECRET não foi definido";
  if (segredo.length < 32) return "SESSION_SECRET precisa ter pelo menos 32 caracteres";
  if (segredo === SEGREDO_DE_EXEMPLO) return "SESSION_SECRET ainda é o valor de exemplo do .env.example";
  if (new Set(segredo).size < 10) return "SESSION_SECRET é fraco demais (poucos caracteres diferentes)";
  return null;
}

const DICA_SEGREDO = `Gere um com: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`;

function chave() {
  const problema = problemaNoSegredo();
  // em desenvolvimento só o "não definido / curto" impede; em produção, qualquer problema
  const grave = !process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32;
  if (problema && (grave || process.env.NODE_ENV === "production")) {
    throw new Error(`${problema}. ${DICA_SEGREDO}`);
  }
  return new TextEncoder().encode(process.env.SESSION_SECRET);
}

// ---------- Admin / funcionário ----------

export type SessaoAdmin = {
  usuarioId: number;
  nome: string;
  papel: "ADMIN" | "FUNCIONARIO";
};

export async function assinarSessaoAdmin(dados: SessaoAdmin) {
  return new SignJWT({ ...dados, tipo: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${DURACAO_ADMIN_DIAS}d`)
    .sign(chave());
}

export async function lerSessaoAdmin(token?: string): Promise<SessaoAdmin | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, chave(), { algorithms: ["HS256"] });
    if (payload.tipo !== "admin") return null;
    return {
      usuarioId: Number(payload.usuarioId),
      nome: String(payload.nome),
      papel: payload.papel === "ADMIN" ? "ADMIN" : "FUNCIONARIO",
    };
  } catch {
    return null;
  }
}

export const opcoesCookieAdmin = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: DURACAO_ADMIN_DIAS * 24 * 60 * 60,
};

// ---------- Dono da plataforma (AutoCare) ----------
// Cookie separado do painel das lojas. O "tipo" dentro do token garante que um
// cookie de loja não sirva como cookie da plataforma (a chave de assinatura é a mesma).

export const COOKIE_PLATAFORMA = "sessao_plataforma";

export type SessaoPlataforma = {
  adminId: number;
  nome: string;
};

export async function assinarSessaoPlataforma(dados: SessaoPlataforma) {
  return new SignJWT({ ...dados, tipo: "plataforma" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${DURACAO_ADMIN_DIAS}d`)
    .sign(chave());
}

export async function lerSessaoPlataforma(token?: string): Promise<SessaoPlataforma | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, chave(), { algorithms: ["HS256"] });
    if (payload.tipo !== "plataforma") return null;
    return { adminId: Number(payload.adminId), nome: String(payload.nome) };
  } catch {
    return null;
  }
}

export const opcoesCookiePlataforma = opcoesCookieAdmin;

// ---------- Cliente do app (conta com celular e senha) ----------
// O nome do cookie mudou ("cliente" -> "sessao_cliente") quando a verificação por código
// saiu: os cookies antigos simplesmente deixam de ser lidos.
// "sv" é uma impressão da senha (src/lib/conta.ts): trocar a senha, ou a plataforma gerar
// uma senha temporária, derruba as sessões abertas em outros aparelhos.

export const COOKIE_CLIENTE = "sessao_cliente";
const DURACAO_CLIENTE_DIAS = 30;

export type SessaoCliente = { clienteId: number; sv: string };

export async function assinarSessaoCliente(dados: SessaoCliente) {
  return new SignJWT({ ...dados, tipo: "cliente" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${DURACAO_CLIENTE_DIAS}d`)
    .sign(chave());
}

export async function lerSessaoCliente(token?: string): Promise<SessaoCliente | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, chave(), { algorithms: ["HS256"] });
    if (payload.tipo !== "cliente" || typeof payload.sv !== "string") return null;
    const clienteId = Number(payload.clienteId);
    return clienteId ? { clienteId, sv: payload.sv } : null;
  } catch {
    return null;
  }
}

export const opcoesCookieCliente = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: DURACAO_CLIENTE_DIAS * 24 * 60 * 60,
};
