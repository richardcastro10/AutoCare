import type { Metadata } from "next";
import Link from "next/link";
import { LogoPlataforma } from "@/components/marca";
import { FormCadastro } from "./form";

export const metadata: Metadata = { title: "Cadastrar loja" };

export default function Cadastro() {
  return (
    <main className="min-h-dvh bg-[radial-gradient(ellipse_at_50%_0%,#14303c,transparent_60%)] px-4 py-10">
      <div className="mx-auto w-full max-w-xl">
        <LogoPlataforma compacto />
        <h1 className="titulo mt-8 text-2xl">Coloque sua estética no app</h1>
        <p className="mt-1 text-texto-suave">
          Seus clientes agendam pelo celular e você controla agenda, estoque e financeiro num painel só.
        </p>
        <FormCadastro />
        <p className="mt-5 text-center text-sm text-texto-suave">
          Já tem acesso?{" "}
          <Link href="/admin/login" className="font-medium text-menta">
            Entrar
          </Link>
        </p>
      </div>
    </main>
  );
}
