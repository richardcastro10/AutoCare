"use server";

import { refresh, updateTag } from "next/cache";
import { z } from "zod";
import type { StatusLoja } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { exigirPlataforma } from "@/lib/dal";
import { TAG_LOJAS, tagLoja } from "@/lib/catalogo";

const esquemaId = z.coerce.number().int().positive();

const esquemaSuspender = z.object({
  lojaId: esquemaId,
  motivo: z
    .string()
    .trim()
    .min(5, "Explique o motivo da suspensão (pelo menos 5 letras).")
    .max(300, "O motivo pode ter até 300 letras."),
});

/**
 * Muda a situação da loja, mas só se ela estiver num dos status de origem
 * (não dá pra "aprovar" uma loja suspensa, por exemplo). Devolve false se não mudou.
 */
async function mudarStatus(lojaId: number, de: StatusLoja[], para: StatusLoja, motivo = "") {
  const { count } = await prisma.loja.updateMany({
    where: { id: lojaId, status: { in: de } },
    data: { status: para, motivoStatus: motivo, statusAlteradoEm: new Date() },
  });
  if (!count) return false;

  // limpa o cache do que o cliente vê: lista de lojas e página da loja
  updateTag(TAG_LOJAS);
  updateTag(tagLoja(lojaId));
  refresh();
  return true;
}

/** PENDENTE -> ATIVA */
export async function aprovarLoja(lojaId: number) {
  await exigirPlataforma();
  const id = esquemaId.safeParse(lojaId);
  if (id.success) await mudarStatus(id.data, ["PENDENTE"], "ATIVA");
}

/** SUSPENSA -> ATIVA */
export async function reativarLoja(lojaId: number) {
  await exigirPlataforma();
  const id = esquemaId.safeParse(lojaId);
  if (id.success) await mudarStatus(id.data, ["SUSPENSA"], "ATIVA");
}

export type EstadoSuspender = { erro: string; motivo: string } | undefined;

/** PENDENTE ou ATIVA -> SUSPENSA, sempre com motivo (o dono da loja vê esse texto) */
export async function suspenderLoja(_anterior: EstadoSuspender, formData: FormData): Promise<EstadoSuspender> {
  await exigirPlataforma();
  const motivo = String(formData.get("motivo") ?? "");
  const resultado = esquemaSuspender.safeParse({ lojaId: formData.get("lojaId"), motivo });
  if (!resultado.success) return { erro: resultado.error.issues[0].message, motivo };

  const mudou = await mudarStatus(resultado.data.lojaId, ["PENDENTE", "ATIVA"], "SUSPENSA", resultado.data.motivo);
  if (!mudou) return { erro: "Essa loja não pode ser suspensa agora. Atualize a página.", motivo };
}
