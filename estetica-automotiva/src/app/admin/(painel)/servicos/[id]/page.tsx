import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { exigirDono } from "@/lib/dal";
import { uploadsHabilitados } from "@/lib/uploads";
import { Aviso, Cabecalho, Carregando } from "@/components/admin/ui";
import { FormServico } from "./form";

export const metadata: Metadata = { title: "Serviço" };

// A mesma página serve pra criar (/admin/servicos/novo) e editar (/admin/servicos/3)
export default function PaginaServico(props: PageProps<"/admin/servicos/[id]">) {
  return (
    <Suspense fallback={<Carregando />}>
      <Conteudo {...props} />
    </Suspense>
  );
}

async function Conteudo({ params, searchParams }: PageProps<"/admin/servicos/[id]">) {
  const { lojaId, loja } = await exigirDono();
  const { id } = await params;
  const { criado } = await searchParams;
  const novo = id === "novo";

  const [servico, produtos] = await Promise.all([
    novo
      ? null
      : prisma.servico.findFirst({
          where: { id: Number(id) || 0, lojaId },
          include: { precos: true, insumos: true },
        }),
    prisma.produto.findMany({
      where: { lojaId, ativo: true },
      select: { id: true, nome: true, unidade: true, precoEmbalagem: true, tamanhoEmbalagem: true },
      orderBy: { nome: "asc" },
    }),
  ]);
  if (!novo && !servico) notFound();

  return (
    <div className="max-w-3xl">
      <Link href="/admin/servicos" className="text-sm font-medium text-menta">
        ‹ Serviços
      </Link>
      <div className="mt-4">
        <Cabecalho titulo={servico ? servico.nome : "Novo serviço"}>
          {servico && (
            <Link href={`/loja/${loja.slug}/servico/${servico.id}`} target="_blank" className="btn-secundario">
              Ver no app
            </Link>
          )}
        </Cabecalho>
      </div>
      {criado && (
        <div className="mb-4">
          <Aviso>Serviço criado. Ele já aparece no app do cliente.</Aviso>
        </div>
      )}
      <FormServico
        servico={
          servico && {
            id: servico.id,
            nome: servico.nome,
            resumo: servico.resumo,
            inclusos: servico.inclusos,
            imagemUrl: servico.imagemUrl,
            duracaoMin: servico.duracaoMin,
            ordem: servico.ordem,
            ativo: servico.ativo,
            destaque: servico.destaque,
            precos: Object.fromEntries(servico.precos.map((p) => [p.tipoVeiculo, p.preco])),
            insumos: servico.insumos.map((i) => ({ produtoId: i.produtoId, quantidade: i.quantidade })),
          }
        }
        produtos={produtos}
        uploads={uploadsHabilitados()}
      />
    </div>
  );
}
