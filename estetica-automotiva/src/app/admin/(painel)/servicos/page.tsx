import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { exigirDono } from "@/lib/dal";
import { NOME_VEICULO, TIPOS_VEICULO } from "@/lib/constantes";
import { formatarDuracao, formatarMoeda } from "@/lib/format";
import { Aviso, Cabecalho, Carregando, Vazio } from "@/components/admin/ui";
import { Foto } from "@/components/foto";

export const metadata: Metadata = { title: "Serviços e preços" };

export default function Servicos(props: PageProps<"/admin/servicos">) {
  return (
    <Suspense fallback={<Carregando />}>
      <Conteudo {...props} />
    </Suspense>
  );
}

async function Conteudo({ searchParams }: PageProps<"/admin/servicos">) {
  const { lojaId } = await exigirDono();
  const { primeiro } = await searchParams;
  const servicos = await prisma.servico.findMany({
    where: { lojaId },
    include: { precos: true, _count: { select: { insumos: true } } },
    orderBy: [{ ativo: "desc" }, { ordem: "asc" }, { nome: "asc" }],
  });

  return (
    <div>
      <Cabecalho titulo="Serviços e preços" descricao="O que aparece pro cliente no app, com preço por tipo de veículo.">
        <Link href="/admin/servicos/novo" className="btn-primario">
          Novo serviço
        </Link>
      </Cabecalho>

      {primeiro && (
        <div className="mb-4">
          <Aviso>Loja criada! Cadastre o primeiro serviço pra ela poder aparecer no app.</Aviso>
        </div>
      )}

      <div className="painel overflow-x-auto">
        {servicos.length === 0 ? (
          <Vazio>Nenhum serviço ainda. Comece pela lavagem que você mais faz.</Vazio>
        ) : (
          <table className="tabela min-w-[820px]">
            <thead>
              <tr>
                <th>Serviço</th>
                <th>Duração</th>
                {TIPOS_VEICULO.map((t) => (
                  <th key={t} className="text-right">
                    {NOME_VEICULO[t]}
                  </th>
                ))}
                <th>Ficha técnica</th>
              </tr>
            </thead>
            <tbody>
              {servicos.map((s) => (
                <tr key={s.id} className={s.ativo ? "" : "opacity-50"}>
                  <td>
                    <Link href={`/admin/servicos/${s.id}`} className="flex items-center gap-3 hover:text-menta">
                      <Foto src={s.imagemUrl} alt="" className="h-10 w-14 shrink-0 rounded-md" />
                      <span>
                        <span className="block font-medium">
                          {s.nome}
                          {!s.ativo && <span className="ml-2 text-xs text-texto-suave">(inativo)</span>}
                        </span>
                        <span className="text-xs text-texto-suave">{s.resumo}</span>
                      </span>
                    </Link>
                  </td>
                  <td className="align-middle tabular-nums">{formatarDuracao(s.duracaoMin)}</td>
                  {TIPOS_VEICULO.map((t) => {
                    const preco = s.precos.find((p) => p.tipoVeiculo === t);
                    return (
                      <td key={t} className="text-right align-middle tabular-nums">
                        {preco ? formatarMoeda(preco.preco) : <span className="text-texto-fraco">não faz</span>}
                      </td>
                    );
                  })}
                  <td className="align-middle text-sm text-texto-suave">
                    {s._count.insumos ? `${s._count.insumos} produtos` : "Sem produtos"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
