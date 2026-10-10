import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { voltarSeguro } from "@/lib/conta";
import { Topo } from "@/components/cliente/topo";
import { FormCriarConta } from "@/components/cliente/form-conta";

export const metadata: Metadata = { title: "Criar conta" };

export default function Criar(props: PageProps<"/conta/criar">) {
  return (
    <>
      <Topo voltar="/" titulo="Criar conta" />
      <main className="flex-1 space-y-5 px-4 pb-8">
        <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-superficie" />}>
          <Conteudo {...props} />
        </Suspense>
      </main>
    </>
  );
}

async function Conteudo({ searchParams }: PageProps<"/conta/criar">) {
  const voltar = voltarSeguro((await searchParams).voltar);
  return (
    <>
      <div className="painel p-5">
        <p className="text-sm text-texto-suave">
          Com a conta você agenda em qualquer loja do app, guarda seus veículos e acompanha seus horários.
        </p>
        <div className="mt-4">
          <FormCriarConta voltar={voltar} />
        </div>
      </div>
      <p className="text-center text-sm text-texto-suave">
        Já tem conta?{" "}
        <Link href={`/conta/entrar?voltar=${encodeURIComponent(voltar)}`} className="font-medium text-menta">
          Entrar
        </Link>
      </p>
    </>
  );
}
