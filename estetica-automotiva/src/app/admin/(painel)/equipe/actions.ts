"use server";

import bcrypt from "bcryptjs";
import { refresh } from "next/cache";
import { prisma } from "@/lib/prisma";
import { exigirDono } from "@/lib/dal";

export type EstadoEquipe = { erro?: string; ok?: string } | undefined;

export async function adicionarUsuario(_anterior: EstadoEquipe, formData: FormData): Promise<EstadoEquipe> {
  const { lojaId } = await exigirDono();
  const nome = String(formData.get("nome") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const senha = String(formData.get("senha") ?? "");
  const papel = formData.get("papel") === "ADMIN" ? "ADMIN" : "FUNCIONARIO";
  if (nome.length < 2) return { erro: "Informe o nome." };
  if (!email.includes("@")) return { erro: "E-mail inválido." };
  if (senha.length < 6) return { erro: "A senha inicial precisa de pelo menos 6 caracteres." };

  const existente = await prisma.usuario.findUnique({ where: { email } });
  if (existente && existente.lojaId !== lojaId) {
    return { erro: "Esse e-mail já é usado em outra loja do app." };
  }

  await prisma.usuario.upsert({
    where: { email },
    update: { nome, papel, ativo: true, senhaHash: await bcrypt.hash(senha, 10) },
    create: { lojaId, nome, email, papel, senhaHash: await bcrypt.hash(senha, 10) },
  });
  refresh();
  return { ok: `${nome} já pode entrar no painel com ${email}.` };
}

export async function alternarUsuario(id: number) {
  const eu = await exigirDono();
  if (id === eu.id) return; // não se desativa sozinho
  const usuario = await prisma.usuario.findFirst({ where: { id, lojaId: eu.lojaId } });
  if (!usuario) return;
  await prisma.usuario.update({ where: { id }, data: { ativo: !usuario.ativo } });
  refresh();
}
