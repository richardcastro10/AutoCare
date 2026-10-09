import type { Metadata } from "next";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { exigirDono } from "@/lib/dal";
import { Cabecalho, Carregando, Secao } from "@/components/admin/ui";
import { alternarUsuario } from "./actions";
import { FormEquipe } from "./form";

export const metadata: Metadata = { title: "Equipe" };

export default function Equipe() {
  return (
    <Suspense fallback={<Carregando />}>
      <Conteudo />
    </Suspense>
  );
}

async function Conteudo() {
  const eu = await exigirDono();
  const usuarios = await prisma.usuario.findMany({
    where: { lojaId: eu.lojaId },
    orderBy: [{ ativo: "desc" }, { nome: "asc" }],
  });

  return (
    <div className="max-w-4xl space-y-6">
      <Cabecalho titulo="Equipe" descricao="Quem acessa o painel da loja." />

      <Secao titulo="Pessoas">
        <ul className="divide-y divide-borda">
          {usuarios.map((u) => (
            <li key={u.id} className={`flex items-center gap-3 px-4 py-3 ${u.ativo ? "" : "opacity-50"}`}>
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-superficie-2 text-sm font-semibold">
                {u.nome.charAt(0).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">
                  {u.nome} {u.id === eu.id && <span className="text-texto-suave">(você)</span>}
                </span>
                <span className="text-xs text-texto-suave">{u.email}</span>
              </span>
              <span className="rounded-full bg-superficie-2 px-2.5 py-0.5 text-xs text-texto-suave">
                {u.papel === "ADMIN" ? "Administrador" : "Funcionário"}
              </span>
              {u.id !== eu.id && (
                <form action={alternarUsuario.bind(null, u.id)}>
                  <button className="text-sm text-texto-suave hover:text-texto">{u.ativo ? "Desativar" : "Reativar"}</button>
                </form>
              )}
            </li>
          ))}
        </ul>
      </Secao>

      <Secao titulo="Adicionar pessoa">
        <FormEquipe />
        <p className="px-4 pb-4 text-xs text-texto-suave">
          Funcionário vê agenda, clientes, veículos e estoque. Financeiro, preços, equipe e relatórios são só do
          administrador.
        </p>
      </Secao>
    </div>
  );
}
