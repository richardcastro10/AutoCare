import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { exigirDono } from "@/lib/dal";
import { resumoDoMes } from "@/lib/relatorios";
import { CATEGORIAS_DESPESA, NOME_PAGAMENTO } from "@/lib/constantes";
import { formatarData, formatarMes, formatarMoeda, hojeISO, somarMeses } from "@/lib/format";
import { Cabecalho, Carregando, Numero, Secao, Vazio } from "@/components/admin/ui";
import { BarrasHorizontais } from "@/components/admin/graficos";
import { BotaoEnviar } from "@/components/admin/botao-enviar";
import { adicionarDespesa, excluirDespesa } from "./actions";

export const metadata: Metadata = { title: "Financeiro" };

export default function Financeiro(props: PageProps<"/admin/financeiro">) {
  return (
    <Suspense fallback={<Carregando />}>
      <Conteudo {...props} />
    </Suspense>
  );
}

async function Conteudo({ searchParams }: PageProps<"/admin/financeiro">) {
  const { lojaId } = await exigirDono();
  const params = await searchParams;
  const hoje = hojeISO();
  const mesAtual = hoje.slice(0, 7);
  const mes = typeof params.mes === "string" && /^\d{4}-\d{2}$/.test(params.mes) ? params.mes : mesAtual;

  const r = await resumoDoMes(lojaId, mes);
  const dataPadrao = mes === mesAtual ? hoje : `${mes}-01`;

  return (
    <div className="space-y-6">
      <Cabecalho titulo="Financeiro" descricao="Entradas dos serviços concluídos, gasto com produtos e despesas da loja.">
        <Link href={`?mes=${somarMeses(mes, -1)}`} className="btn-secundario px-3" aria-label="Mês anterior">
          ‹
        </Link>
        <span className="btn-secundario pointer-events-none min-w-44 first-letter:uppercase">{formatarMes(mes)}</span>
        <Link
          href={`?mes=${somarMeses(mes, 1)}`}
          className={`btn-secundario px-3 ${mes >= mesAtual ? "pointer-events-none opacity-40" : ""}`}
          aria-label="Próximo mês"
        >
          ›
        </Link>
      </Cabecalho>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Numero
          rotulo="Entrou (serviços)"
          valor={formatarMoeda(r.receita)}
          detalhe={`${r.atendimentos} serviços, ${formatarMoeda(r.descontos)} em descontos`}
        />
        <Numero rotulo="Gasto com produtos" valor={formatarMoeda(r.custoInsumos)} detalhe="Baixa automática do estoque" />
        <Numero rotulo="Despesas da loja" valor={formatarMoeda(r.totalDespesas)} detalhe={`${r.despesas.length} lançamentos`} />
        <Numero
          rotulo="Sobrou"
          valor={formatarMoeda(r.lucro)}
          tom={r.lucro >= 0 ? "positivo" : "negativo"}
          detalhe={r.perdidos ? `${r.perdidos} cancelamentos ou faltas no mês` : "Nenhuma falta no mês"}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Secao titulo="Como os clientes pagaram">
          <div className="p-4">
            {r.porPagamento.length ? (
              <BarrasHorizontais
                itens={r.porPagamento.map(([forma, valor]) => ({
                  rotulo: NOME_PAGAMENTO[forma],
                  valor,
                  texto: `${formatarMoeda(valor)} (${r.receita ? Math.round((valor / r.receita) * 100) : 0}%)`,
                }))}
              />
            ) : (
              <Vazio>Sem recebimentos nesse mês.</Vazio>
            )}
          </div>
        </Secao>
        <Secao titulo="Despesas por categoria">
          <div className="p-4">
            {r.porCategoria.length ? (
              <BarrasHorizontais
                itens={r.porCategoria.map(([categoria, valor]) => ({
                  rotulo: categoria,
                  valor,
                  texto: formatarMoeda(valor),
                }))}
              />
            ) : (
              <Vazio>Sem despesas nesse mês.</Vazio>
            )}
          </div>
        </Secao>
      </div>

      <Secao titulo="Despesas">
        <form action={adicionarDespesa} className="grid gap-3 border-b border-borda p-4 sm:grid-cols-[1fr_11rem_9rem_10rem_auto] sm:items-end">
          <div>
            <label className="rotulo" htmlFor="descricao">
              Descrição
            </label>
            <input id="descricao" name="descricao" className="campo" placeholder="Ex.: conta de água" required />
          </div>
          <div>
            <label className="rotulo" htmlFor="categoria">
              Categoria
            </label>
            <select id="categoria" name="categoria" className="campo">
              {CATEGORIAS_DESPESA.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="rotulo" htmlFor="valor">
              Valor
            </label>
            <input id="valor" name="valor" inputMode="decimal" placeholder="0,00" className="campo" required />
          </div>
          <div>
            <label className="rotulo" htmlFor="data">
              Data
            </label>
            <input id="data" name="data" type="date" className="campo" defaultValue={dataPadrao} required />
          </div>
          <BotaoEnviar pendente="...">Lançar</BotaoEnviar>
        </form>

        {r.despesas.length === 0 ? (
          <Vazio>Nenhuma despesa lançada em {formatarMes(mes)}.</Vazio>
        ) : (
          <div className="overflow-x-auto">
            <table className="tabela min-w-[560px]">
              <tbody>
                {r.despesas.map((d) => (
                  <tr key={d.id}>
                    <td className="w-28 tabular-nums">{formatarData(d.data)}</td>
                    <td>{d.descricao}</td>
                    <td className="text-texto-suave">{d.categoria}</td>
                    <td className="text-right tabular-nums">{formatarMoeda(d.valor)}</td>
                    <td className="w-20 text-right">
                      <form action={excluirDespesa.bind(null, d.id)}>
                        <button className="text-sm text-texto-suave hover:text-perigo">Excluir</button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Secao>
    </div>
  );
}
