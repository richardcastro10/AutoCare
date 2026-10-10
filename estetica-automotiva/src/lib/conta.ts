// Conta do cliente do app: celular + senha (bcrypt), sem nenhum serviço externo.
// - sessão: cookie assinado (src/lib/sessao.ts), 30 dias;
// - força bruta: 5 senhas erradas seguidas no mesmo celular bloqueiam o login por 15 minutos
//   (guardado na tabela TentativaLogin);
// - "esqueci a senha": a plataforma gera uma senha temporária (/plataforma/clientes),
//   e o cliente é obrigado a trocar no próximo login.
import "server-only";
import { createHash, randomInt } from "node:crypto";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { z } from "zod";
import { prisma } from "./prisma";
import { somenteDigitos } from "./format";
import { COOKIE_CLIENTE, assinarSessaoCliente, opcoesCookieCliente } from "./sessao";

export const MAX_FALHAS = 5;
export const BLOQUEIO_MIN = 15;
const BLOQUEIO_MS = BLOQUEIO_MIN * 60 * 1000;

export const esquemaCelular = z
  .string()
  .transform(somenteDigitos)
  .refine((t) => t.length === 10 || t.length === 11, "Celular inválido. Use DDD + número.");

export const esquemaSenha = z
  .string()
  .min(8, "A senha precisa de pelo menos 8 caracteres.")
  .max(72, "A senha pode ter até 72 caracteres."); // limite do bcrypt

export const MENSAGEM_LOGIN_ERRADO = "Celular ou senha incorretos.";

export function mensagemBloqueio(minutos: number) {
  return `Muitas tentativas erradas. Por segurança, o login deste celular está bloqueado por ${minutos} ${
    minutos === 1 ? "minuto" : "minutos"
  }. Tente de novo depois.`;
}

export const gerarHashSenha = (senha: string) => bcrypt.hash(senha, 10);

/** Muda sempre que a senha muda: vai dentro do cookie e derruba sessões antigas */
export function impressaoSenha(senhaHash: string) {
  return createHash("sha256").update(senhaHash).digest("base64url").slice(0, 16);
}

export async function gravarSessaoCliente(cliente: { id: number; senhaHash: string }) {
  const token = await assinarSessaoCliente({ clienteId: cliente.id, sv: impressaoSenha(cliente.senhaHash) });
  (await cookies()).set(COOKIE_CLIENTE, token, opcoesCookieCliente);
}

export async function apagarSessaoCliente() {
  const guardados = await cookies();
  guardados.delete(COOKIE_CLIENTE);
  guardados.delete("cliente"); // cookie da antiga verificação por código, se ainda estiver no aparelho
}

/**
 * Pra onde voltar depois do login. Só aceita caminho interno ("/meus-agendamentos"):
 * nada de "https://outro-site", "//outro-site" ou "/\outro-site".
 */
export function voltarSeguro(valor: unknown, padrao = "/meus-agendamentos") {
  if (typeof valor !== "string" || !valor.startsWith("/") || valor.startsWith("//")) return padrao;
  if (valor.includes("\\") || /[\u0000-\u001f\u007f]/.test(valor)) return padrao;
  try {
    // confere de novo do jeito que o navegador interpretaria
    if (new URL(valor, "http://interno").host !== "interno") return padrao;
  } catch {
    return padrao;
  }
  // voltar pro próprio login daria uma volta à toa
  if (valor.startsWith("/conta/entrar") || valor.startsWith("/conta/criar")) return padrao;
  return valor;
}

// Hash de uma senha qualquer: celular sem conta também passa pelo bcrypt,
// assim o tempo de resposta não entrega quais celulares têm conta.
let hashFalso: Promise<string> | undefined;
const pegarHashFalso = () => (hashFalso ??= bcrypt.hash("celular-sem-conta", 10));

export type ResultadoLogin =
  | {
      ok: true;
      cliente: { id: number; nome: string; telefone: string; senhaHash: string; senhaTemporaria: boolean };
    }
  | { ok: false; bloqueadoMin?: number };

/** Confere celular e senha, contando as falhas. Mensagens pro cliente: MENSAGEM_LOGIN_ERRADO e mensagemBloqueio() */
export async function tentarLogin(telefone: string, senha: string): Promise<ResultadoLogin> {
  const agora = new Date();
  const minutosAte = (data: Date) => Math.max(1, Math.ceil((data.getTime() - agora.getTime()) / 60000));

  const anterior = await prisma.tentativaLogin.findUnique({ where: { telefone } });
  if (anterior?.bloqueadoAte && anterior.bloqueadoAte > agora) {
    return { ok: false, bloqueadoMin: minutosAte(anterior.bloqueadoAte) };
  }
  // bloqueio que já passou, ou erros de mais de 15 minutos atrás: recomeça a contagem
  if (anterior && (anterior.bloqueadoAte || agora.getTime() - anterior.ultimaFalha.getTime() > BLOQUEIO_MS)) {
    await prisma.tentativaLogin.update({ where: { telefone }, data: { falhas: 0, bloqueadoAte: null } });
  }

  // Conta a tentativa ANTES de conferir a senha: várias tentativas ao mesmo tempo
  // não conseguem passar do limite. Se a senha estiver certa, o registro é apagado.
  const tentativa = await contarTentativa(telefone, agora);

  const bloquear = async () => {
    const ate = new Date(agora.getTime() + BLOQUEIO_MS);
    await prisma.tentativaLogin.update({ where: { telefone }, data: { bloqueadoAte: ate, falhas: 0 } });
    return { ok: false as const, bloqueadoMin: BLOQUEIO_MIN };
  };
  if (tentativa.falhas > MAX_FALHAS) return bloquear();

  const cliente = await prisma.cliente.findUnique({
    where: { telefone },
    select: { id: true, nome: true, telefone: true, senhaHash: true, senhaTemporaria: true },
  });
  const senhaCerta = cliente?.senhaHash
    ? await bcrypt.compare(senha, cliente.senhaHash)
    : (await bcrypt.compare(senha, await pegarHashFalso()), false);

  if (cliente?.senhaHash && senhaCerta) {
    await prisma.tentativaLogin.deleteMany({ where: { telefone } });
    return { ok: true, cliente: { ...cliente, senhaHash: cliente.senhaHash } };
  }
  if (tentativa.falhas >= MAX_FALHAS) return bloquear();
  return { ok: false };
}

async function contarTentativa(telefone: string, agora: Date) {
  const somar = () =>
    prisma.tentativaLogin.upsert({
      where: { telefone },
      create: { telefone, falhas: 1, ultimaFalha: agora },
      update: { falhas: { increment: 1 }, ultimaFalha: agora },
    });
  try {
    return await somar();
  } catch {
    // dois logins do mesmo celular criando o registro ao mesmo tempo: o segundo só soma
    return somar();
  }
}

/** Senha temporária de 10 caracteres, sem letras que confundem (0/O, 1/l/I) */
export function gerarSenhaTemporaria() {
  const letras = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  return Array.from({ length: 10 }, () => letras[randomInt(letras.length)]).join("");
}
