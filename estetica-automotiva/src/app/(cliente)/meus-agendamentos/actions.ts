"use server";

// Verificação do WhatsApp do cliente. Usadas em "Meus horários" e no passo de
// confirmação do agendamento (components/cliente/verificar-whatsapp.tsx).
import { refresh } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { somenteDigitos } from "@/lib/format";
import { COOKIE_CLIENTE, assinarCliente, opcoesCookieCliente } from "@/lib/sessao";
import { INTERVALO_SEG, conferirCodigo, criarCodigo } from "@/lib/verificacao";

const telefoneValido = z
  .string()
  .transform(somenteDigitos)
  .refine((t) => t.length === 10 || t.length === 11, "WhatsApp inválido. Use DDD + número.");

export type EstadoEnvio =
  | {
      ok: boolean;
      mensagem: string;
      /** segundos até poder pedir outro código (pra contagem regressiva) */
      aguardarSeg?: number;
    }
  | undefined;

function textoEspera(segundos: number) {
  if (segundos <= 90) return `Aguarde ${segundos} segundos pra pedir outro código.`;
  return `Muitos códigos pedidos. Tente de novo em ${Math.ceil(segundos / 60)} minutos.`;
}

export async function enviarCodigo(_anterior: EstadoEnvio, formData: FormData): Promise<EstadoEnvio> {
  const telefone = telefoneValido.safeParse(formData.get("telefone") ?? "");
  if (!telefone.success) return { ok: false, mensagem: telefone.error.issues[0].message };

  const resultado = await criarCodigo(telefone.data);
  if (!resultado.ok) {
    return resultado.motivo === "limite"
      ? { ok: false, mensagem: textoEspera(resultado.aguardarSeg), aguardarSeg: resultado.aguardarSeg }
      : { ok: false, mensagem: "Não foi possível enviar o código agora. Tente de novo em instantes." };
  }
  // a mesma resposta pra qualquer número: não entrega se o telefone já tem cadastro
  return { ok: true, mensagem: "Enviamos um código pro seu WhatsApp.", aguardarSeg: INTERVALO_SEG };
}

const esquemaVerificar = z.object({
  telefone: telefoneValido,
  codigo: z
    .string()
    .transform(somenteDigitos)
    .refine((c) => c.length === 6, "Digite os 6 números do código."),
  nome: z.string().trim().max(80).default(""),
  // no agendamento o nome é obrigatório: é com ele que um cliente novo é criado
  exigeNome: z.string().optional(),
});

export type EstadoVerificacao =
  | { erro: string }
  // cliente = null: código certo, mas o número não tem cadastro (só acontece em "Meus horários")
  | { ok: true; cliente: { nome: string; telefone: string } | null }
  | undefined;

export async function verificarCodigo(_anterior: EstadoVerificacao, formData: FormData): Promise<EstadoVerificacao> {
  const resultado = esquemaVerificar.safeParse({
    telefone: formData.get("telefone") ?? "",
    codigo: formData.get("codigo") ?? "",
    nome: formData.get("nome") ?? "",
    exigeNome: formData.get("exigeNome") ?? undefined,
  });
  if (!resultado.success) return { erro: resultado.error.issues[0].message };
  const { telefone, codigo, nome, exigeNome } = resultado.data;
  // confere o nome ANTES de gastar o código
  if (exigeNome && nome.length < 2) return { erro: "Informe seu nome." };

  const conferencia = await conferirCodigo(telefone, codigo);
  if (!conferencia.ok) {
    return {
      erro:
        conferencia.restantes > 0
          ? `Código incorreto. ${conferencia.restantes === 1 ? "Resta 1 tentativa" : `Restam ${conferencia.restantes} tentativas`}.`
          : "Código inválido ou vencido. Peça um novo código.",
    };
  }

  // Daqui pra baixo a pessoa provou que o número é dela.
  // Número que já tem cadastro: fica o nome que está no banco (não sobrescreve com o digitado).
  let cliente = await prisma.cliente.findUnique({ where: { telefone }, select: { id: true, nome: true, telefone: true } });
  if (!cliente && nome.length >= 2) {
    cliente = await prisma.cliente.upsert({
      where: { telefone },
      update: {},
      create: { nome, telefone },
      select: { id: true, nome: true, telefone: true },
    });
  }
  // sem cadastro e sem nome ("Meus horários"): não cria cliente nem grava cookie
  if (!cliente) return { ok: true, cliente: null };

  (await cookies()).set(COOKIE_CLIENTE, await assinarCliente(cliente.id), opcoesCookieCliente);
  refresh(); // a tela atual passa a enxergar o cliente (lista de horários, veículos salvos)
  return { ok: true, cliente: { nome: cliente.nome, telefone: cliente.telefone } };
}

/** "Sair deste aparelho": esquece o cliente aqui (os agendamentos continuam no banco) */
export async function sairDoAparelho() {
  (await cookies()).delete(COOKIE_CLIENTE);
  redirect("/meus-agendamentos");
}
