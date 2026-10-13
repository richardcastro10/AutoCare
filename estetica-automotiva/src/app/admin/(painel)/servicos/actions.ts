"use server";

import { refresh, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { exigirDono } from "@/lib/dal";
import { TAG_LOJAS, tagLoja } from "@/lib/catalogo";
import { TIPOS_VEICULO } from "@/lib/constantes";
import { lerMoeda } from "@/lib/format";
import { removerImagem, salvarImagem, uploadsHabilitados } from "@/lib/uploads";

export type EstadoServico = { erro?: string; ok?: boolean } | undefined;

const esquema = z.object({
  nome: z.string().trim().min(2, "Informe o nome do serviço"),
  resumo: z.string().trim().max(60),
  inclusos: z.string().max(1500),
  duracaoMin: z.coerce.number().int().min(5, "Duração mínima de 5 minutos").max(24 * 60),
  ordem: z.coerce.number().int().default(0),
});

/** Limpa o cache do que o cliente vê (página da loja e lista de lojas) */
function limparCache(lojaId: number) {
  updateTag(tagLoja(lojaId));
  updateTag(TAG_LOJAS);
}

export async function salvarServico(
  id: number | null,
  _anterior: EstadoServico,
  formData: FormData,
): Promise<EstadoServico> {
  const { lojaId } = await exigirDono();

  const resultado = esquema.safeParse({
    nome: formData.get("nome"),
    resumo: formData.get("resumo") ?? "",
    inclusos: formData.get("inclusos") ?? "",
    duracaoMin: formData.get("duracaoMin"),
    ordem: formData.get("ordem") || 0,
  });
  if (!resultado.success) return { erro: resultado.error.issues[0].message };

  // serviço que está sendo editado precisa ser desta loja
  const atual = id ? await prisma.servico.findFirst({ where: { id, lojaId } }) : null;
  if (id && !atual) return { erro: "Serviço não encontrado." };

  // preço vazio = esse tipo de veículo não faz esse serviço
  const precos = TIPOS_VEICULO.map((tipo) => ({
    tipoVeiculo: tipo,
    texto: String(formData.get(`preco_${tipo}`) ?? "").trim(),
  }))
    .filter((p) => p.texto !== "")
    .map((p) => ({ tipoVeiculo: p.tipoVeiculo, preco: lerMoeda(p.texto) }));
  if (precos.length === 0) return { erro: "Informe o preço para pelo menos um tipo de veículo." };

  // linhas da ficha técnica: insumo_produto[] e insumo_qtd[] na mesma ordem
  const produtosDaLoja = new Set(
    (await prisma.produto.findMany({ where: { lojaId }, select: { id: true } })).map((p) => p.id),
  );
  const produtos = formData.getAll("insumo_produto").map(Number);
  const quantidades = formData.getAll("insumo_qtd").map((q) => Number(String(q).replace(",", ".")));
  const insumos = new Map<number, number>();
  produtos.forEach((produtoId, i) => {
    if (produtosDaLoja.has(produtoId) && quantidades[i] > 0) {
      insumos.set(produtoId, (insumos.get(produtoId) ?? 0) + quantidades[i]);
    }
  });

  // foto: nova enviada, removida ou mantida. Com o envio de fotos desligado
  // (UPLOADS_HABILITADOS), qualquer arquivo é ignorado e a foto atual fica como está.
  let imagemUrl = atual?.imagemUrl ?? "";
  if (uploadsHabilitados()) {
    const upload = await salvarImagem(formData.get("imagem"));
    if (upload && "erro" in upload) return { erro: upload.erro };
    if (upload) imagemUrl = upload.url;
    else if (formData.get("removerImagem") === "on") imagemUrl = "";
    if (atual?.imagemUrl && atual.imagemUrl !== imagemUrl) await removerImagem(atual.imagemUrl);
  }

  const dados = {
    ...resultado.data,
    // "O que está incluso": um item por linha, sem linhas vazias
    inclusos: resultado.data.inclusos
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .join("\n"),
    imagemUrl,
    ativo: formData.get("ativo") === "on",
    destaque: formData.get("destaque") === "on",
  };

  const servico = await prisma.$transaction(async (tx) => {
    const salvo = atual
      ? await tx.servico.update({ where: { id: atual.id }, data: dados })
      : await tx.servico.create({ data: { ...dados, lojaId } });

    // mais simples que comparar: apaga e recria preços e insumos
    await tx.precoServico.deleteMany({ where: { servicoId: salvo.id } });
    await tx.precoServico.createMany({ data: precos.map((p) => ({ ...p, servicoId: salvo.id })) });
    await tx.servicoInsumo.deleteMany({ where: { servicoId: salvo.id } });
    await tx.servicoInsumo.createMany({
      data: [...insumos].map(([produtoId, quantidade]) => ({ servicoId: salvo.id, produtoId, quantidade })),
    });
    return salvo;
  });

  limparCache(lojaId);
  if (!atual) redirect(`/admin/servicos/${servico.id}?criado=1`);
  refresh();
  return { ok: true };
}

export async function excluirServico(id: number) {
  const { lojaId } = await exigirDono();
  const servico = await prisma.servico.findFirst({ where: { id, lojaId } });
  if (!servico) return;

  const usos = await prisma.agendamentoItem.count({ where: { servicoId: id } });
  if (usos > 0) {
    // já foi usado em agendamento: só desativa, pra não estragar o histórico
    await prisma.servico.update({ where: { id }, data: { ativo: false } });
  } else {
    await prisma.servico.delete({ where: { id } });
    if (servico.imagemUrl) await removerImagem(servico.imagemUrl);
  }
  limparCache(lojaId);
  redirect("/admin/servicos");
}
