import type { Metadata } from "next";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { exigirCliente } from "@/lib/dal";
import { NOME_VEICULO } from "@/lib/constantes";
import { formatarTelefone } from "@/lib/format";
import { IconeVeiculo } from "@/components/icones";
import { Placa } from "@/components/placa";
import { NavCliente } from "@/components/cliente/nav";
import { sair } from "./actions";
import { FormNome, FormTrocarSenha } from "./forms";

export const metadata: Metadata = { title: "Minha conta" };

export default function MinhaConta() {
  return (
    <>
      <main className="flex-1 px-4 pb-6 pt-[max(1.25rem,env(safe-area-inset-top))]">
        <h1 className="titulo text-2xl">Minha conta</h1>
        <Suspense fallback={<div className="mt-4 h-80 animate-pulse rounded-xl bg-superficie" />}>
          <Conteudo />
        </Suspense>
      </main>
      <NavCliente ativo="conta" />
    </>
  );
}

async function Conteudo() {
  const cliente = await exigirCliente("/conta");
  // só os veículos cadastrados pelo app; os do balcão ficam no painel da loja
  const veiculos = await prisma.veiculo.findMany({
    where: { clienteId: cliente.id, origem: "APP" },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mt-5 space-y-5">
      <section className="painel p-4">
        <h2 className="font-semibold">Seus dados</h2>
        <p className="mt-1 text-sm text-texto-suave">
          Celular (login): <span className="text-texto">{formatarTelefone(cliente.telefone)}</span>
        </p>
        <div className="mt-3">
          <FormNome nome={cliente.nome} />
        </div>
      </section>

      <section className="painel p-4">
        <h2 className="font-semibold">Seus veículos</h2>
        {veiculos.length === 0 ? (
          <p className="mt-1 text-sm text-texto-suave">Os veículos que você usar nos agendamentos ficam salvos aqui.</p>
        ) : (
          <ul className="mt-3 divide-y divide-borda">
            {veiculos.map((v) => (
              <li key={v.id} className="flex items-center gap-3 py-2.5">
                <IconeVeiculo tipo={v.tipo} className="h-6 w-11 shrink-0 text-texto-suave" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{v.modelo}</span>
                  <span className="text-xs text-texto-suave">{NOME_VEICULO[v.tipo]}</span>
                </span>
                <Placa placa={v.placa} pequena />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="painel p-4">
        <h2 className="font-semibold">Trocar senha</h2>
        <div className="mt-3">
          <FormTrocarSenha />
        </div>
      </section>

      <form action={sair} className="text-center">
        <button className="btn-perigo w-full">Sair deste aparelho</button>
      </form>
    </div>
  );
}
