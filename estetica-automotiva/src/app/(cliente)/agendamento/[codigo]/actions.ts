"use server";

import { refresh, updateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { TAG_LOJAS, tagLoja } from "@/lib/catalogo";
import { agoraEmMinutos, hojeISO } from "@/lib/format";

// O código do agendamento funciona como "senha": só quem tem o link consegue mexer
export async function cancelarAgendamento(codigo: string) {
  const agendamento = await prisma.agendamento.findUnique({ where: { codigo } });
  if (!agendamento) return;

  const hoje = hojeISO();
  const jaPassou =
    agendamento.data < hoje || (agendamento.data === hoje && agendamento.inicio <= agoraEmMinutos());
  const podeCancelar = ["PENDENTE", "CONFIRMADO"].includes(agendamento.status) && !jaPassou;
  if (!podeCancelar) return;

  await prisma.agendamento.update({
    where: { id: agendamento.id },
    data: { status: "CANCELADO", observacoes: `${agendamento.observacoes}\n[Cancelado pelo cliente]`.trim() },
  });
  refresh();
}

export async function avaliar(codigo: string, formData: FormData) {
  const nota = Number(formData.get("nota"));
  const comentario = String(formData.get("comentario") ?? "").trim().slice(0, 500);
  if (!Number.isInteger(nota) || nota < 1 || nota > 5) return;

  const agendamento = await prisma.agendamento.findUnique({
    where: { codigo },
    include: { avaliacao: { select: { id: true } } },
  });
  // só avalia serviço concluído, e uma vez só
  if (!agendamento || agendamento.status !== "CONCLUIDO" || agendamento.avaliacao) return;

  await prisma.avaliacao.create({
    data: {
      lojaId: agendamento.lojaId,
      clienteId: agendamento.clienteId,
      agendamentoId: agendamento.id,
      nota,
      comentario,
    },
  });
  // a nota média aparece na lista de lojas e na página da loja (que estão em cache)
  updateTag(tagLoja(agendamento.lojaId));
  updateTag(TAG_LOJAS);
  refresh();
}
