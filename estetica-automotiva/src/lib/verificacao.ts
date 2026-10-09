// Código de verificação do WhatsApp: é o que prova que o cliente é dono do número
// (o cliente não tem senha). As actions ficam em app/(cliente)/meus-agendamentos/actions.ts.
import "server-only";
import { randomInt } from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { enviarMensagem } from "./whatsapp";
import { NOME_PLATAFORMA } from "./constantes";

export const VALIDADE_MIN = 10; // o código vale 10 minutos
export const INTERVALO_SEG = 60; // um pedido de código a cada 60 s por telefone
export const MAX_POR_HORA = 5; // e no máximo 5 por hora
export const MAX_TENTATIVAS = 5; // palpites por código

const UMA_HORA = 60 * 60 * 1000;

export type ResultadoEnvio =
  | { ok: true }
  | { ok: false; motivo: "limite"; aguardarSeg: number }
  | { ok: false; motivo: "envio" };

/**
 * Gera um código novo e manda pro WhatsApp.
 * De propósito NÃO olha a tabela Cliente: o comportamento é o mesmo pra número
 * cadastrado ou não, então ninguém descobre por aqui quais telefones existem.
 *
 * TODO(antes de produção): limitar também por IP. O limite só por telefone deixa alguém
 * gastar a cota de um número alheio (o dono fica até 1 h sem receber código) e disparar
 * mensagens pra muitos números diferentes a partir de um IP só.
 */
export async function criarCodigo(telefone: string): Promise<ResultadoEnvio> {
  const agora = Date.now();
  const anteriores = await prisma.codigoVerificacao.findMany({
    where: { telefone },
    orderBy: { id: "desc" },
    select: { id: true, createdAt: true },
  });
  // a conta de tempo é feita aqui (e não no SQL) pra não depender do formato de data do SQLite
  const naUltimaHora = anteriores.filter((c) => agora - c.createdAt.getTime() < UMA_HORA);

  const ultimo = naUltimaHora[0];
  if (ultimo && agora - ultimo.createdAt.getTime() < INTERVALO_SEG * 1000) {
    const aguardarSeg = Math.ceil((ultimo.createdAt.getTime() + INTERVALO_SEG * 1000 - agora) / 1000);
    return { ok: false, motivo: "limite", aguardarSeg };
  }
  if (naUltimaHora.length >= MAX_POR_HORA) {
    const maisAntigo = naUltimaHora.at(-1)!;
    const aguardarSeg = Math.ceil((maisAntigo.createdAt.getTime() + UMA_HORA - agora) / 1000);
    return { ok: false, motivo: "limite", aguardarSeg };
  }

  // códigos com mais de 1 h não servem mais nem pra contar o limite
  const velhos = anteriores.filter((c) => !naUltimaHora.includes(c)).map((c) => c.id);
  if (velhos.length) await prisma.codigoVerificacao.deleteMany({ where: { id: { in: velhos } } });

  const codigo = String(randomInt(0, 1_000_000)).padStart(6, "0");
  // só o código mais recente do telefone vale (ver conferirCodigo): pedir outro invalida o anterior
  const criado = await prisma.codigoVerificacao.create({
    data: {
      telefone,
      codigoHash: await bcrypt.hash(codigo, 10),
      expiraEm: new Date(agora + VALIDADE_MIN * 60 * 1000),
      createdAt: new Date(agora),
    },
  });

  const enviado = await enviarMensagem(
    telefone,
    `Seu código ${NOME_PLATAFORMA}: ${codigo}. Vale por ${VALIDADE_MIN} minutos. Não passe esse código pra ninguém.`,
  );
  if (!enviado) {
    // não chegou no cliente: não conta no limite
    await prisma.codigoVerificacao.delete({ where: { id: criado.id } });
    return { ok: false, motivo: "envio" };
  }
  return { ok: true };
}

export type ResultadoConferencia =
  | { ok: true }
  // restantes = 0: acabou a chance (ou não tem código válido); precisa pedir outro
  | { ok: false; restantes: number };

/** Confere o código digitado contra o código mais recente do telefone e, se bater, gasta ele */
export async function conferirCodigo(telefone: string, codigo: string): Promise<ResultadoConferencia> {
  const atual = await prisma.codigoVerificacao.findFirst({ where: { telefone }, orderBy: { id: "desc" } });
  if (!atual || atual.usadoEm || atual.expiraEm.getTime() <= Date.now() || atual.tentativas >= MAX_TENTATIVAS) {
    return { ok: false, restantes: 0 };
  }

  // Conta a tentativa ANTES de comparar, numa atualização condicional: vários palpites
  // enviados ao mesmo tempo não conseguem passar do limite.
  const contou = await prisma.codigoVerificacao.updateMany({
    where: { id: atual.id, usadoEm: null, tentativas: { lt: MAX_TENTATIVAS } },
    data: { tentativas: { increment: 1 } },
  });
  if (!contou.count) return { ok: false, restantes: 0 };

  if (!(await bcrypt.compare(codigo, atual.codigoHash))) {
    return { ok: false, restantes: Math.max(0, MAX_TENTATIVAS - atual.tentativas - 1) };
  }

  // cada código serve uma vez só
  const gastou = await prisma.codigoVerificacao.updateMany({
    where: { id: atual.id, usadoEm: null },
    data: { usadoEm: new Date() },
  });
  return gastou.count ? { ok: true } : { ok: false, restantes: 0 };
}
