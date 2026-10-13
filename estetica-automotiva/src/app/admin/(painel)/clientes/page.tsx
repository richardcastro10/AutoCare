import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { exigirAdmin } from "@/lib/dal";
import { formatarData, formatarMoeda, formatarTelefone, hojeISO, somarDias, somenteDigitos } from "@/lib/format";
import { Cabecalho, Carregando, Vazio } from "@/components/admin/ui";
import { Placa } from "@/components/placa";

export const metadata: Metadata = { title: "Clientes" };

export default function Clientes(props: PageProps<"/admin/clientes">) {
  return (
    <Suspense fallback={<Carregando />}>
      <Conteudo {...props} />
    </Suspense>
  );
}

async function Conteudo({ searchParams }: PageProps<"/admin/clientes">) {
  const { lojaId } = await exigirAdmin();
  const { q } = await searchParams;
  const busca = typeof q === "string" ? q.trim() : "";
  const digitos = somenteDigitos(busca);

  const clientes = await prisma.cliente.findMany({
    where: {
      // clientes são do app inteiro; aqui aparecem só os que já agendaram nesta loja
      agendamentos: { some: { lojaId } },
      ...(busca && {
        OR: [
          // Postgres diferencia maiúsculas: mode "insensitive" faz "ana" achar "Ana"
          { nome: { contains: busca, mode: "insensitive" } },
          ...(digitos ? [{ telefone: { contains: digitos } }] : []),
          { veiculos: { some: { placa: { contains: busca.toUpperCase().replace(/[^A-Z0-9]/g, "") } } } },
        ],
      }),
    },
    include: {
      veiculos: { where: { agendamentos: { some: { lojaId } } } },
      agendamentos: {
        where: { lojaId, status: "CONCLUIDO" },
        select: { valorPago: true, data: true },
        orderBy: { data: "desc" },
      },
    },
    orderBy: { nome: "asc" },
    take: 200,
  });

  // cliente "sumido": última lavagem há mais de 45 dias (bom pra mandar uma mensagem)
  const limiteSumido = somarDias(hojeISO(), -45);

  return (
    <div>
      <Cabecalho titulo="Clientes" descricao="Cadastro automático: todo mundo que agenda aparece aqui." />

      <form className="mb-4 flex gap-2">
        <input
          name="q"
          defaultValue={busca}
          placeholder="Buscar por nome, telefone ou placa"
          className="campo max-w-md"
          type="search"
        />
        <button className="btn-secundario">Buscar</button>
      </form>

      <div className="painel overflow-x-auto">
        {clientes.length === 0 ? (
          <Vazio>Nenhum cliente encontrado.</Vazio>
        ) : (
          <table className="tabela min-w-[760px]">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Veículos</th>
                <th className="text-right">Serviços</th>
                <th className="text-right">Total gasto</th>
                <th>Última visita</th>
              </tr>
            </thead>
            <tbody>
              {clientes.map((c) => {
                const total = c.agendamentos.reduce((t, a) => t + (a.valorPago ?? 0), 0);
                const ultima = c.agendamentos[0]?.data;
                return (
                  <tr key={c.id}>
                    <td>
                      <Link href={`/admin/clientes/${c.id}`} className="font-semibold text-texto hover:text-menta">
                        {c.nome}
                      </Link>
                      <span className="block text-sm text-texto-suave">{formatarTelefone(c.telefone)}</span>
                    </td>
                    <td>
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        {c.veiculos.map((v) => (
                          <span key={v.id} className="flex items-center gap-1.5">
                            {v.modelo}
                            <Placa placa={v.placa} pequena />
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="text-right tabular-nums">{c.agendamentos.length}</td>
                    <td className="text-right tabular-nums">{formatarMoeda(total)}</td>
                    <td className="tabular-nums">
                      {ultima ? formatarData(ultima) : "-"}
                      {ultima && ultima < limiteSumido && (
                        <span className="ml-2 rounded-full bg-dourado/15 px-2 py-0.5 text-[11px] text-dourado">Sumido</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
