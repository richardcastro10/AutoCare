"use server";

import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { COOKIE_ADMIN, assinarSessaoAdmin, opcoesCookieAdmin } from "@/lib/sessao";

const esquema = z.object({
  email: z.string().trim().toLowerCase(),
  senha: z.string(),
});

export type EstadoLogin = { erro: string; motivo?: string; email: string } | undefined;

export async function entrar(_anterior: EstadoLogin, formData: FormData): Promise<EstadoLogin> {
  const resultado = esquema.safeParse({ email: formData.get("email"), senha: formData.get("senha") });
  if (!resultado.success) return { erro: "E-mail ou senha incorretos.", email: "" };
  const { email, senha } = resultado.data;

  const usuario = await prisma.usuario.findUnique({
    where: { email },
    include: { loja: { select: { status: true, motivoStatus: true } } },
  });
  // mesma mensagem pra e-mail ou senha errados (não entrega quais e-mails existem)
  if (!usuario || !usuario.ativo || !(await bcrypt.compare(senha, usuario.senhaHash))) {
    return { erro: "E-mail ou senha incorretos.", email };
  }

  // loja suspensa pela plataforma: ninguém da loja entra.
  // Só chega aqui quem acertou a senha, então pode mostrar o motivo.
  if (usuario.loja.status === "SUSPENSA") {
    return { erro: "Acesso suspenso. Fale com o suporte.", motivo: usuario.loja.motivoStatus, email };
  }

  await prisma.usuario.update({ where: { id: usuario.id }, data: { ultimoAcesso: new Date() } });

  const token = await assinarSessaoAdmin({
    usuarioId: usuario.id,
    nome: usuario.nome,
    papel: usuario.papel,
  });
  (await cookies()).set(COOKIE_ADMIN, token, opcoesCookieAdmin);

  redirect(usuario.papel === "ADMIN" ? "/admin" : "/admin/agendamentos");
}

export async function sair() {
  (await cookies()).delete(COOKIE_ADMIN);
  redirect("/admin/login");
}
