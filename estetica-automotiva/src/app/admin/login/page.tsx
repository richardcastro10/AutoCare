import type { Metadata } from "next";
import Link from "next/link";
import { LogoPlataforma } from "@/components/marca";
import { FormLogin } from "./form";

export const metadata: Metadata = { title: "Entrar no painel" };

export default function Login() {
  return (
    <main className="grid min-h-dvh place-items-center bg-[radial-gradient(ellipse_at_50%_0%,#14303c,transparent_60%)] px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <LogoPlataforma />
          <p className="mt-3 text-center text-sm text-texto-suave">Painel do proprietário</p>
        </div>
        <div className="painel p-6">
          <h1 className="titulo text-xl">Entrar</h1>
          <FormLogin />
        </div>
        <p className="mt-5 text-center text-sm text-texto-suave">
          Tem uma estética e ainda não está no app?{" "}
          <Link href="/admin/cadastro" className="font-medium text-menta">
            Cadastre sua loja
          </Link>
        </p>
      </div>
    </main>
  );
}
