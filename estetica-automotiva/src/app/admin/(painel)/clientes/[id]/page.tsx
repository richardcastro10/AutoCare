import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { exigirAdmin } from "@/lib/dal";
import { NOME_VEICULO } from "@/lib/constantes";
import {
  formatarData,
  formatarMoeda,
  formatarTelefone,
  linkWhatsApp,
  minutosParaHora,
} from "@/lib/format";
import { Cabecalho, Carregando, Numero, Secao } from "@/components/admin/ui";
import { IconeVeiculo } from "@/components/icones";
import { Placa } from "@/components/placa";
import { StatusChip } from "@/components/status-chip";

export const metadata: Metadata = { title: "Cliente" };

export default function PaginaCliente(props: PageProps<"/admin/clientes/[id]">) {
  return (
    <Suspense fallback={<Carregando />}>
      <Conteudo {...props} />
    </Suspense>
  );
}

async function Conteudo({ params }: PageProps<"/admin/clientes/[id]">) {
  const { lojaId, loja } = await exigirAdmin();
  const id = Number((await params).id);
  const [cliente] = await Promise.all([
    // o cliente é do app, mas aqui só aparece se já agendou nesta loja
    prisma.cliente.findFirst({
      where: { id: id || 0, agendamentos: { some: { lojaId } } },
      include: {
        veiculos: { where: { agendamentos: { some: { lojaId } } } },
        agendamentos: {
          where: { lojaId },
          include: { itens: { select: { nomeServico: true } }, veiculo: { select: { modelo: true } } },
          orderBy: [{ data: "desc" }, { inicio: "desc" }],
        },
      },
    }),
  ]);
  if (!cliente) notFound();

  const concluidos = cliente.agendamentos.filter((a) => a.status === "CONCLUIDO");
  const total = concluidos.reduce((t, a) => t + (a.valorPago ?? 0), 0);
  const faltas = cliente.agendamentos.filter((a) => a.status === "NAO_COMPARECEU").length;
  const primeiroNome = cliente.nome.split(" ")[0];

  return (
    <div className="max-w-5xl space-y-6">
      <Link href="/admin/clientes" className="text-sm font-semibold text-menta">
        ‹ Clientes
      </Link>
      <Cabecalho titulo={cliente.nome} descricao={`Cliente desde ${cliente.createdAt.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}`}>
        <a
          className="btn-secundario"
          href={linkWhatsApp(cliente.telefone, `Olá, ${primeiroNome}! Aqui é da ${loja.nome}.`)}
          target="_blank"
          rel="noreferrer"
        >
          WhatsApp {formatarTelefone(cliente.telefone)}
        </a>
      </Cabecalho>

      <div className="grid gap-4 sm:grid-cols-3">
        <Numero rotulo="Total gasto" valor={formatarMoeda(total)} />
        <Numero
          rotulo="Serviços concluídos"
          valor={concluidos.length}
          detalhe={concluidos.length ? `Ticket médio ${formatarMoeda(Math.round(total / concluidos.length))}` : undefined}
        />
        <Numero rotulo="Faltas" valor={faltas} tom={faltas ? "alerta" : "normal"} />
      </div>

      <Secao titulo="Veículos">
        <ul className="divide-y divide-borda">
          {cliente.veiculos.map((v) => (
            <li key={v.id} className="flex items-center gap-4 px-4 py-3">
              <IconeVeiculo tipo={v.tipo} className="h-6 w-12 text-menta" />
              <div className="flex-1">
                <p className="font-semibold">{v.modelo}</p>
                <p className="text-sm text-texto-suave">{NOME_VEICULO[v.tipo]}</p>
              </div>
              <Placa placa={v.placa} />
            </li>
          ))}
        </ul>
      </Secao>

      <Secao titulo="Histórico">
        <div className="overflow-x-auto">
          <table className="tabela min-w-[640px]">
            <thead>
              <tr>
                <th>Data</th>
                <th>Serviços</th>
                <th>Veículo</th>
                <th>Situação</th>
                <th className="text-right">Valor</th>
              </tr>
            </thead>
            <tbody>
              {cliente.agendamentos.map((a) => (
                <tr key={a.id}>
                  <td className="whitespace-nowrap tabular-nums">
                    <Link href={`/admin/agendamentos/${a.id}`} className="hover:text-menta">
                      {formatarData(a.data)} {minutosParaHora(a.inicio)}
                    </Link>
                  </td>
                  <td>{a.itens.map((i) => i.nomeServico).join(" + ")}</td>
                  <td>{a.veiculo.modelo}</td>
                  <td>
                    <StatusChip status={a.status} curto />
                  </td>
                  <td className="text-right tabular-nums">{formatarMoeda(a.valorPago ?? a.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Secao>
    </div>
  );
}
