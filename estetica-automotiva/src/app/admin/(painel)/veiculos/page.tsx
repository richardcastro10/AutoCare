import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import type { TipoVeiculo } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { exigirAdmin } from "@/lib/dal";
import { NOME_VEICULO, TIPOS_VEICULO } from "@/lib/constantes";
import { formatarData, formatarMoeda, formatarTelefone } from "@/lib/format";
import { Cabecalho, Carregando, Vazio } from "@/components/admin/ui";
import { IconeVeiculo } from "@/components/icones";
import { Placa } from "@/components/placa";

export const metadata: Metadata = { title: "Veículos" };

export default function Veiculos(props: PageProps<"/admin/veiculos">) {
  return (
    <Suspense fallback={<Carregando />}>
      <Conteudo {...props} />
    </Suspense>
  );
}

async function Conteudo({ searchParams }: PageProps<"/admin/veiculos">) {
  const { lojaId } = await exigirAdmin();
  const { q, tipo } = await searchParams;
  const busca = typeof q === "string" ? q.trim() : "";
  const tipoFiltro = TIPOS_VEICULO.includes(tipo as TipoVeiculo) ? (tipo as TipoVeiculo) : null;

  const veiculos = await prisma.veiculo.findMany({
    where: {
      agendamentos: { some: { lojaId } }, // só os que já vieram nesta loja
      ...(tipoFiltro && { tipo: tipoFiltro }),
      ...(busca && {
        OR: [
          { modelo: { contains: busca } },
          { placa: { contains: busca.toUpperCase().replace(/[^A-Z0-9]/g, "") } },
          { cliente: { nome: { contains: busca } } },
        ],
      }),
    },
    include: {
      cliente: { select: { id: true, nome: true, telefone: true } },
      agendamentos: {
        where: { lojaId, status: "CONCLUIDO" },
        select: { data: true, valorPago: true },
        orderBy: { data: "desc" },
      },
    },
    take: 300,
  });
  // quem veio mais vezes primeiro
  veiculos.sort((a, b) => b.agendamentos.length - a.agendamentos.length);

  const link = (t: TipoVeiculo | null) => {
    const p = new URLSearchParams();
    if (busca) p.set("q", busca);
    if (t) p.set("tipo", t);
    return `?${p}`;
  };

  return (
    <div>
      <Cabecalho titulo="Veículos" descricao="Todos os carros e motos que já passaram pela loja." />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <form className="flex gap-2">
          {tipoFiltro && <input type="hidden" name="tipo" value={tipoFiltro} />}
          <input name="q" defaultValue={busca} type="search" placeholder="Placa, modelo ou dono" className="campo w-64" />
          <button className="btn-secundario">Buscar</button>
        </form>
        <div className="flex flex-wrap gap-1.5">
          {[null, ...TIPOS_VEICULO].map((t) => (
            <Link
              key={t ?? "todos"}
              href={link(t)}
              className={`rounded-full border px-3 py-1.5 text-sm ${
                tipoFiltro === t ? "border-menta bg-menta/10 text-menta" : "border-borda text-texto-suave hover:text-texto"
              }`}
            >
              {t ? NOME_VEICULO[t] : "Todos"}
            </Link>
          ))}
        </div>
      </div>

      <div className="painel overflow-x-auto">
        {veiculos.length === 0 ? (
          <Vazio>Nenhum veículo encontrado.</Vazio>
        ) : (
          <table className="tabela min-w-[760px]">
            <thead>
              <tr>
                <th>Veículo</th>
                <th>Placa</th>
                <th>Dono</th>
                <th className="text-right">Serviços</th>
                <th className="text-right">Total gasto</th>
                <th>Última visita</th>
              </tr>
            </thead>
            <tbody>
              {veiculos.map((v) => (
                <tr key={v.id}>
                  <td className="align-middle">
                    <span className="flex items-center gap-3">
                      <IconeVeiculo tipo={v.tipo} className="h-5 w-9 shrink-0 text-texto-suave" />
                      <span>
                        <span className="block font-medium">{v.modelo}</span>
                        <span className="text-xs text-texto-suave">{NOME_VEICULO[v.tipo]}</span>
                      </span>
                    </span>
                  </td>
                  <td className="align-middle">
                    <Placa placa={v.placa} pequena />
                  </td>
                  <td className="align-middle">
                    <Link href={`/admin/clientes/${v.cliente.id}`} className="hover:text-menta">
                      {v.cliente.nome}
                    </Link>
                    <span className="block text-xs text-texto-suave">{formatarTelefone(v.cliente.telefone)}</span>
                  </td>
                  <td className="text-right align-middle tabular-nums">{v.agendamentos.length}</td>
                  <td className="text-right align-middle tabular-nums">
                    {formatarMoeda(v.agendamentos.reduce((t, a) => t + (a.valorPago ?? 0), 0))}
                  </td>
                  <td className="align-middle tabular-nums">
                    {v.agendamentos[0] ? formatarData(v.agendamentos[0].data) : "-"}
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
