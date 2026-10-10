// Sessões guardadas em cookie, assinadas com JWT (biblioteca jose).
// Não tem "server-only" aqui porque o proxy.ts também usa as funções de verificação.
import { SignJWT, jwtVerify } from "jose";

export const COOKIE_ADMIN = "sessao_admin";

const DURACAO_ADMIN_DIAS = 7;

function chave() {
  const segredo = process.env.SESSION_SECRET;
  if (!segredo || segredo.length < 32) {
    throw new Error("Defina SESSION_SECRET no .env com pelo menos 32 caracteres");
  }
  return new TextEncoder().encode(segredo);
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
