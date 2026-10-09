import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { exigirAdmin } from "@/lib/dal";
import { formatarDataHora, formatarMoeda, formatarQuantidade } from "@/lib/format";
import { Cabecalho, Carregando, Numero, Secao, Vazio } from "@/components/admin/ui";
import { BotaoEnviar } from "@/components/admin/botao-enviar";
import { ajustarEstoque, registrarEntrada, salvarProduto } from "../actions";
import { CamposProduto } from "../campos-produto";

export const metadata: Metadata = { title: "Produto" };

export default function PaginaProduto(props: PageProps<"/admin/estoque/[id]">) {
  return (
    <Suspense fallback={<Carregando />}>
      <Conteudo {...props} />
    </Suspense>
  );
}

const NOME_MOVIMENTO = { ENTRADA: "Entrada", SAIDA: "Uso", AJUSTE: "Ajuste" } as const;

async function Conteudo({ params }: PageProps<"/admin/estoque/[id]">) {
  const usuario = await exigirAdmin();
  const id = Number((await params).id);
  const produto = await prisma.produto.findFirst({
    where: { id: id || 0, lojaId: usuario.lojaId },
    include: {
      movimentos: {
        orderBy: { createdAt: "desc" },
        take: 60,
        include: { agendamento: { select: { id: true, data: true } } },
      },
      insumos: { include: { servico: { select: { id: true, nome: true } } } },
    },
  });
  if (!produto) notFound();

  const baixo = produto.estoqueAtual <= produto.estoqueMinimo;

  return (
    <div className="max-w-5xl space-y-6">
      <Link href="/admin/estoque" className="text-sm font-semibold text-menta">
        ‹ Estoque
      </Link>
      <Cabecalho
        titulo={produto.nome}
        descricao={
          produto.insumos.length
            ? `Usado em: ${produto.insumos.map((i) => i.servico.nome).join(", ")}`
            : "Não está na ficha técnica de nenhum serviço"
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Numero
          rotulo="Em estoque"
          valor={formatarQuantidade(produto.estoqueAtual, produto.unidade)}
          tom={baixo ? "negativo" : "normal"}
          detalhe={baixo ? `Abaixo do mínimo (${formatarQuantidade(produto.estoqueMinimo, produto.unidade)})` : undefined}
        />
        <Numero
          rotulo="Custo por unidade"
          valor={formatarMoeda(Math.round((produto.precoEmbalagem / produto.tamanhoEmbalagem) * 100))}
          detalhe={`a cada 100 ${produto.unidade}`}
        />
        <Numero
          rotulo="Embalagem"
          valor={formatarMoeda(produto.precoEmbalagem)}
          detalhe={formatarQuantidade(produto.tamanhoEmbalagem, produto.unidade)}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Secao titulo="Registrar compra">
          <form action={registrarEntrada.bind(null, produto.id)} className="space-y-3 p-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="rotulo" htmlFor="embalagens">
                  Embalagens
                </label>
                <input id="embalagens" name="embalagens" type="number" min={0} step="any" className="campo" required />
              </div>
              <div>
                <label className="rotulo" htmlFor="valorPago">
                  Valor pago (total)
                </label>
                <input id="valorPago" name="valorPago" inputMode="decimal" className="campo" placeholder="0,00" />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="atualizarPreco" defaultChecked className="size-4 accent-menta" />
              Atualizar o preço da embalagem com essa compra
            </label>
            <BotaoEnviar>Lançar entrada</BotaoEnviar>
          </form>
        </Secao>

        <Secao titulo="Corrigir pela contagem">
          <form action={ajustarEstoque.bind(null, produto.id)} className="space-y-3 p-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="rotulo" htmlFor="contagem">
                  Quanto tem ({produto.unidade})
                </label>
                <input id="contagem" name="contagem" type="number" min={0} step="any" className="campo" required />
              </div>
              <div>
                <label className="rotulo" htmlFor="motivo">
                  Motivo
                </label>
                <input id="motivo" name="motivo" className="campo" placeholder="Contagem, vazamento..." />
              </div>
            </div>
            <p className="text-xs text-texto-suave">O sistema lança a diferença como ajuste.</p>
            <BotaoEnviar className="btn-secundario">Ajustar estoque</BotaoEnviar>
          </form>
        </Secao>
      </div>

      <Secao titulo="Movimentações">
        {produto.movimentos.length === 0 ? (
          <Vazio>Nenhuma movimentação ainda.</Vazio>
        ) : (
          <div className="overflow-x-auto">
            <table className="tabela min-w-[600px]">
              <thead>
                <tr>
                  <th>Quando</th>
                  <th>Tipo</th>
                  <th>Descrição</th>
                  <th className="text-right">Quantidade</th>
                  <th className="text-right">Valor</th>
                </tr>
              </thead>
              <tbody>
                {produto.movimentos.map((m) => (
                  <tr key={m.id}>
                    <td className="whitespace-nowrap tabular-nums">{formatarDataHora(m.createdAt)}</td>
                    <td>{NOME_MOVIMENTO[m.tipo]}</td>
                    <td>
                      {m.agendamento ? (
                        <Link href={`/admin/agendamentos/${m.agendamento.id}`} className="text-menta hover:underline">
                          {m.motivo}
                        </Link>
                      ) : (
                        m.motivo
                      )}
                    </td>
                    <td
                      className={`text-right tabular-nums ${m.quantidade > 0 ? "text-menta" : "text-texto"}`}
                    >
                      {m.quantidade > 0 ? "+" : ""}
                      {formatarQuantidade(Math.round(m.quantidade * 10) / 10, produto.unidade)}
                    </td>
                    <td className="text-right tabular-nums">{formatarMoeda(m.custoTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Secao>

      {usuario.papel === "ADMIN" && (
        <Secao titulo="Dados do produto">
          <form action={salvarProduto.bind(null, produto.id)} className="space-y-4 p-4">
            <CamposProduto produto={produto} />
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="ativo" defaultChecked={produto.ativo} className="size-4 accent-menta" />
                Produto ativo
              </label>
              <BotaoEnviar>Salvar</BotaoEnviar>
            </div>
          </form>
        </Secao>
      )}
    </div>
  );
}
