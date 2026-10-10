"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { exigirPlataforma } from "@/lib/dal";
import { gerarHashSenha, gerarSenhaTemporaria as novaSenhaTemporaria } from "@/lib/conta";

export type EstadoSenhaTemporaria = { erro?: string; senha?: string } | undefined;

/**
 * "Esqueci a senha": gera uma senha temporária pro cliente do app.
 * A senha aparece UMA vez (só nesta resposta; no banco fica só o hash).
 * No próximo login o cliente é obrigado a criar uma nova, e as sessões abertas caem.
 */
export async function gerarSenhaTemporaria(
  _anterior: EstadoSenhaTemporaria,
  formData: FormData,
): Promise<EstadoSenhaTemporaria> {
  await exigirPlataforma();
  const id = z.coerce.number().int().positive().safeParse(formData.get("clienteId"));
  if (!id.success) return { erro: "Cliente inválido." };

  const cliente = await prisma.cliente.findUnique({
    where: { id: id.data },
    select: { id: true, telefone: true, contaCriadaEm: true },
  });
  if (!cliente) return { erro: "Cliente não encontrado." };

  const senha = novaSenhaTemporaria();
  await prisma.$transaction([
    prisma.cliente.update({
      where: { id: cliente.id },
      data: {
        senhaHash: await gerarHashSenha(senha),
        senhaTemporaria: true,
        // cliente só de balcão passa a ter conta a partir daqui
        contaCriadaEm: cliente.contaCriadaEm ?? new Date(),
      },
    }),
    // libera o login se o celular estava bloqueado por senha errada
    prisma.tentativaLogin.deleteMany({ where: { telefone: cliente.telefone } }),
  ]);
  return { senha };
}
