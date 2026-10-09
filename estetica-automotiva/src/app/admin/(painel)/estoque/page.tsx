import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { exigirAdmin } from "@/lib/dal";
import { formatarMoeda, formatarQuantidade, hojeISO, somarDias } from "@/lib/format";
import { Cabecalho, Carregando, Numero } from "@/components/admin/ui";
import { BotaoEnviar } from "@/components/admin/botao-enviar";
import { salvarProduto } from "./actions";
import { CamposProduto } from "./campos-produto";

export const metadata: Metadata = { title: "Estoque" };

export default function Estoque() {
  return (
    <Suspense fallback={<Carregando />}>
      <Conteudo />
    </Suspense>
  );
}

async function Conteudo() {
  const usuario = await exigirAdmin();
  const desde = new Date(`${somarDias(hojeISO(), -30)}T00:00:00-03:00`);

  const [produtos, consumo30] = await Promise.all([
    prisma.produto.findMany({ where: { lojaId: usuario.lojaId }, orderBy: [{ ativo: "desc" }, { nome: "asc" }] }),
    prisma.movimentoEstoque.groupBy({
      by: ["produtoId"],
      where: { tipo: "SAIDA", createdAt: { gte: desde }, produto: { lojaId: usuario.lojaId } },
      _sum: { quantidade: true },
    }),
  ]);

  const custoUnidade = (p: (typeof produtos)[number]) => p.precoEmbalagem / p.tamanhoEmbalagem;
  const valorEmEstoque = produtos.reduce((t, p) => t + p.estoqueAtual * custoUnidade(p), 0);
  const baixos = produtos.filter((p) => p.ativo && p.estoqueAtual <= p.estoqueMinimo);

  return (
    <div className="space-y-6">
      <Cabecalho
        titulo="Estoque"
        descricao="A baixa é automática quando um serviço é concluído, conforme a ficha técnica."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Numero rotulo="Valor parado em estoque" valor={formatarMoeda(Math.round(valorEmEstoque))} />
        <Numero rotulo="Produtos cadastrados" valor={produtos.filter((p) => p.ativo).length} />
        <Numero
          rotulo="Abaixo do mínimo"
          valor={baixos.length}
          tom={baixos.length ? "alerta" : "normal"}
          detalhe={baixos.length ? baixos.map((p) => p.nome).join(", ") : "Nada pra repor agora"}
        />
      </div>

      <div className="painel overflow-x-auto">
        <table className="tabela min-w-[760px]">
          <thead>
            <tr>
              <th>Produto</th>
              <th className="text-right">Em estoque</th>
              <th className="text-right">Mínimo</th>
              <th className="text-right">Uso em 30 dias</th>
              <th className="text-right">Dura mais</th>
              <th className="text-right">Custo da embalagem</th>
            </tr>
          </thead>
          <tbody>
            {produtos.map((p) => {
              const usado = -(consumo30.find((c) => c.produtoId === p.id)?._sum.quantidade ?? 0);
              const diasRestantes = usado > 0 ? Math.floor(p.estoqueAtual / (usado / 30)) : null;
              const baixo = p.estoqueAtual <= p.estoqueMinimo;
              const embalagens = p.estoqueAtual / p.tamanhoEmbalagem;
              return (
                <tr key={p.id} className={p.ativo ? "" : "text-texto-suave"}>
                  <td>
                    <Link href={`/admin/estoque/${p.id}`} className="font-semibold text-texto hover:text-menta">
                      {p.nome}
                    </Link>
                    {!p.ativo && <span className="ml-2 text-xs">(inativo)</span>}
                  </td>
                  <td className="text-right tabular-nums">
                    <span className={baixo ? "font-semibold text-perigo" : ""}>
                      {formatarQuantidade(p.estoqueAtual, p.unidade)}
                    </span>
                    <span className="block text-xs text-texto-suave">
                      {embalagens.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} emb. de{" "}
                      {formatarQuantidade(p.tamanhoEmbalagem, p.unidade)}
                    </span>
                  </td>
                  <td className="text-right tabular-nums">{formatarQuantidade(p.estoqueMinimo, p.unidade)}</td>
                  <td className="text-right tabular-nums">{usado ? formatarQuantidade(Math.round(usado), p.unidade) : "-"}</td>
                  <td className="text-right tabular-nums">
                    {diasRestantes === null ? "-" : diasRestantes > 365 ? "+1 ano" : `${diasRestantes} dias`}
                  </td>
                  <td className="text-right tabular-nums">{formatarMoeda(p.precoEmbalagem)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {usuario.papel === "ADMIN" && (
        <details className="painel">
          <summary className="cursor-pointer px-4 py-3 font-semibold">Cadastrar produto</summary>
          <form action={salvarProduto.bind(null, null)} className="space-y-4 border-t border-borda p-4">
            <CamposProduto />
            <p className="text-xs text-texto-suave">
              Ex.: shampoo em galão de 5 litros: unidade ml, embalagem 5000, preço R$ 89,90. Depois de criar, lance a
              compra na tela do produto.
            </p>
            <div className="flex justify-end">
              <BotaoEnviar>Cadastrar</BotaoEnviar>
            </div>
          </form>
        </details>
      )}
    </div>
  );
}
