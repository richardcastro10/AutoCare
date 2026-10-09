"use server";

import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { COOKIE_PLATAFORMA, assinarSessaoPlataforma, opcoesCookiePlataforma } from "@/lib/sessao";

const esquema = z.object({
  email: z.string().trim().toLowerCase(),
  senha: z.string(),
});

export type EstadoLoginPlataforma = { erro: string; email: string } | undefined;

// Única action da plataforma que não chama exigirPlataforma(): é ela que cria a sessão
export async function entrarPlataforma(
  _anterior: EstadoLoginPlataforma,
  formData: FormData,
): Promise<EstadoLoginPlataforma> {
  const resultado = esquema.safeParse({ email: formData.get("email"), senha: formData.get("senha") });
  if (!resultado.success) return { erro: "E-mail ou senha incorretos.", email: "" };
  const { email, senha } = resultado.data;

  const admin = await prisma.adminPlataforma.findUnique({ where: { email } });
  // mesma mensagem pra e-mail ou senha errados (não entrega quais e-mails existem)
  if (!admin || !(await bcrypt.compare(senha, admin.senhaHash))) {
    return { erro: "E-mail ou senha incorretos.", email };
  }

  const token = await assinarSessaoPlataforma({ adminId: admin.id, nome: admin.nome });
  (await cookies()).set(COOKIE_PLATAFORMA, token, opcoesCookiePlataforma);

  redirect("/plataforma");
}

export async function sairPlataforma() {
  (await cookies()).delete(COOKIE_PLATAFORMA);
  redirect("/plataforma/login");
}
