"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { exigirAdmin, exigirDono } from "@/lib/dal";
import { UNIDADES } from "@/lib/constantes";
import { lerMoeda } from "@/lib/format";

const numero = (v: FormDataEntryValue | null) => Number(String(v ?? "").replace(",", "."));

const esquemaProduto = z.object({
  nome: z.string().trim().min(2),
  unidade: z.enum(UNIDADES as [string, ...string[]]),
  tamanhoEmbalagem: z.number().positive(),
  precoEmbalagem: z.number().int().min(0),
  estoqueMinimo: z.number().min(0),
});

export async function salvarProduto(id: number | null, formData: FormData) {
  const { lojaId } = await exigirDono();
  const dados = esquemaProduto.parse({
    nome: formData.get("nome"),
    unidade: formData.get("unidade"),
    tamanhoEmbalagem: numero(formData.get("tamanhoEmbalagem")),
    precoEmbalagem: lerMoeda(String(formData.get("precoEmbalagem") ?? "")),
    estoqueMinimo: numero(formData.get("estoqueMinimo")) || 0,
  });

  if (id) {
    // updateMany com lojaId: só altera se o produto for desta loja
    await prisma.produto.updateMany({ where: { id, lojaId }, data: { ...dados, ativo: formData.get("ativo") === "on" } });
    refresh();
    return;
  }

  const produto = await prisma.produto.create({ data: { ...dados, lojaId } });
  redirect(`/admin/estoque/${produto.id}`);
}

/** Compra de produto: informa quantas embalagens e quanto pagou no total */
export async function registrarEntrada(produtoId: number, formData: FormData) {
  const { lojaId } = await exigirAdmin();
  const embalagens = numero(formData.get("embalagens"));
  if (!(embalagens > 0)) return;

  const produto = await prisma.produto.findFirstOrThrow({ where: { id: produtoId, lojaId } });
  const quantidade = embalagens * produto.tamanhoEmbalagem;
  const valorPago = lerMoeda(String(formData.get("valorPago") ?? "")) || Math.round(embalagens * produto.precoEmbalagem);
  const atualizarPreco = formData.get("atualizarPreco") === "on";

  await prisma.$transaction([
    prisma.movimentoEstoque.create({
      data: {
        produtoId,
        tipo: "ENTRADA",
        quantidade,
        custoTotal: valorPago,
        motivo: String(formData.get("motivo") || `Compra de ${embalagens} embalagem(ns)`),
      },
    }),
    prisma.produto.update({
      where: { id: produtoId },
      data: {
        estoqueAtual: { increment: quantidade },
        // guarda o preço da última compra como referência de custo
        ...(atualizarPreco ? { precoEmbalagem: Math.round(valorPago / embalagens) } : {}),
      },
    }),
  ]);
  refresh();
}

/** Contagem física: informa quanto tem de verdade e o sistema lança a diferença */
export async function ajustarEstoque(produtoId: number, formData: FormData) {
  const { lojaId } = await exigirAdmin();
  const contagem = numero(formData.get("contagem"));
  if (!(contagem >= 0)) return;

  const produto = await prisma.produto.findFirstOrThrow({ where: { id: produtoId, lojaId } });
  const diferenca = contagem - produto.estoqueAtual;
  if (diferenca === 0) return;

  await prisma.$transaction([
    prisma.movimentoEstoque.create({
      data: {
        produtoId,
        tipo: "AJUSTE",
        quantidade: diferenca,
        custoTotal: Math.round(Math.abs(diferenca) * (produto.precoEmbalagem / produto.tamanhoEmbalagem)),
        motivo: String(formData.get("motivo") || "Contagem de estoque"),
      },
    }),
    prisma.produto.update({ where: { id: produtoId }, data: { estoqueAtual: contagem } }),
  ]);
  refresh();
}
