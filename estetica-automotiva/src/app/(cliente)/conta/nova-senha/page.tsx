import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { clienteAtual } from "@/lib/dal";
import { voltarSeguro } from "@/lib/conta";
import { Topo } from "@/components/cliente/topo";
import { FormNovaSenha } from "@/components/cliente/form-conta";

export const metadata: Metadata = { title: "Senha nova" };

// Depois de entrar com a senha temporária gerada pela plataforma, o cliente cai aqui
// (exigirCliente() manda pra cá) e só segue depois de criar uma senha nova.
export default function NovaSenha(props: PageProps<"/conta/nova-senha">) {
  return (
    <>
      <Topo voltar="/" titulo="Crie uma senha nova" />
      <main className="flex-1 px-4 pb-8">
        <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-superficie" />}>
          <Conteudo {...props} />
        </Suspense>
      </main>
    </>
  );
}

async function Conteudo({ searchParams }: PageProps<"/conta/nova-senha">) {
  const voltar = voltarSeguro((await searchParams).voltar);
  // aqui não dá pra usar exigirCliente(): ele mandaria de volta pra esta página
  const cliente = await clienteAtual();
  if (!cliente) redirect(`/conta/entrar?voltar=${encodeURIComponent(voltar)}`);
  if (!cliente.senhaTemporaria) redirect(voltar);

  return (
    <div className="painel p-5">
      <p className="text-sm text-texto-suave">
        Olá, {cliente.nome}! Você entrou com uma senha temporária. Crie uma senha nova pra continuar.
      </p>
      <div className="mt-4">
        <FormNovaSenha voltar={voltar} />
      </div>
    </div>
  );
}
