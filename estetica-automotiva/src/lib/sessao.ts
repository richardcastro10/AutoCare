// Sessões guardadas em cookie, assinadas com JWT (biblioteca jose).
// Não tem "server-only" aqui porque o proxy.ts também usa as funções de verificação.
import { SignJWT, jwtVerify } from "jose";

export const COOKIE_ADMIN = "sessao_admin";
export const COOKIE_CLIENTE = "cliente";

const DURACAO_ADMIN_DIAS = 7;
const DURACAO_CLIENTE_DIAS = 365;

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

// ---------- Cliente ----------
// O cliente não tem senha: ele confirma o WhatsApp com um código (lib/verificacao.ts)
// e guardamos um cookie assinado com o id dele. Assim "Meus horários" funciona nesse aparelho.
// Só quem chama assinarCliente() é a action verificarCodigo, depois do código certo.

export async function assinarCliente(clienteId: number) {
  return new SignJWT({ clienteId, tipo: "cliente", verificado: true })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${DURACAO_CLIENTE_DIAS}d`)
    .sign(chave());
}

export async function lerCliente(token?: string): Promise<number | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, chave(), { algorithms: ["HS256"] });
    if (payload.tipo !== "cliente") return null;
    // Cookies antigos (de antes da verificação por código) não têm essa marca e não valem
    // mais: eram dados a quem só digitava o telefone, sem provar que o número era dele.
    if (payload.verificado !== true) return null;
    return Number(payload.clienteId) || null;
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
