"use server";

import { refresh } from "next/cache";
import { prisma } from "@/lib/prisma";
import { exigirDono } from "@/lib/dal";
import { dataValida, lerMoeda } from "@/lib/format";

export async function adicionarDespesa(formData: FormData) {
  const { lojaId } = await exigirDono();
  const descricao = String(formData.get("descricao") ?? "").trim();
  const categoria = String(formData.get("categoria") ?? "Outros");
  const valor = lerMoeda(String(formData.get("valor") ?? ""));
  const data = String(formData.get("data") ?? "");
  if (!descricao || valor <= 0 || !dataValida(data)) return;

  await prisma.despesa.create({ data: { lojaId, descricao, categoria, valor, data } });
  refresh();
}

export async function excluirDespesa(id: number) {
  const { lojaId } = await exigirDono();
  await prisma.despesa.deleteMany({ where: { id, lojaId } });
  refresh();
}
