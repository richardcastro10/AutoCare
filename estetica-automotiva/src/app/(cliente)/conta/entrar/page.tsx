import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getLojasAtivas } from "@/lib/catalogo";
import { voltarSeguro } from "@/lib/conta";
import { linkWhatsApp } from "@/lib/format";
import { Topo } from "@/components/cliente/topo";
import { FormEntrar } from "@/components/cliente/form-conta";
import { IconeConversa } from "@/components/icones";

export const metadata: Metadata = { title: "Entrar" };

export default function Entrar(props: PageProps<"/conta/entrar">) {
  return (
    <>
      <Topo voltar="/" titulo="Entrar" />
      <main className="flex-1 space-y-5 px-4 pb-8">
        <Suspense fallback={<div className="h-72 animate-pulse rounded-xl bg-superficie" />}>
          <Conteudo {...props} />
        </Suspense>
      </main>
    </>
  );
}

async function Conteudo({ searchParams }: PageProps<"/conta/entrar">) {
  const voltar = voltarSeguro((await searchParams).voltar);
  const lojas = await getLojasAtivas();

  return (
    <>
      <div className="painel p-5">
        <p className="text-sm text-texto-suave">Entre com o celular e a senha da sua conta.</p>
        <div className="mt-4">
          <FormEntrar voltar={voltar} />
        </div>
      </div>

      <p className="text-center text-sm text-texto-suave">
        Ainda não tem conta?{" "}
        <Link href={`/conta/criar?voltar=${encodeURIComponent(voltar)}`} className="font-medium text-menta">
          Criar conta
        </Link>
      </p>

      {/* Sem e-mail nem SMS: quem esqueceu fala com a loja, e a plataforma gera uma senha temporária */}
      <details className="painel p-4 text-sm">
        <summary className="cursor-pointer font-medium">Esqueci a senha</summary>
        <p className="mt-2 text-texto-suave">
          Fale com a loja onde você agendou. Ela pede pra gente uma senha temporária pra você entrar e criar uma nova.
        </p>
        {lojas.some((l) => l.telefone) && (
          <ul className="mt-3 space-y-2">
            {lojas
              .filter((l) => l.telefone)
              .map((l) => (
                <li key={l.id}>
                  <a
                    href={linkWhatsApp(l.telefone, `Olá! Esqueci a senha da minha conta no app. Pode me ajudar?`)}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-secundario w-full justify-start"
                  >
                    <IconeConversa className="size-4" />
                    WhatsApp da {l.nome}
                  </a>
                </li>
              ))}
          </ul>
        )}
      </details>
    </>
  );
}
