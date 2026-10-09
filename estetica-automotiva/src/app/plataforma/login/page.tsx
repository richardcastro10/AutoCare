import type { Metadata } from "next";
import { LogoPlataforma } from "@/components/marca";
import { FormLoginPlataforma } from "./form";

export const metadata: Metadata = { title: "Painel da plataforma" };

// Login do dono do AutoCare: separado do login das lojas (/admin/login)
export default function LoginPlataforma() {
  return (
    <main className="grid min-h-dvh place-items-center bg-[radial-gradient(ellipse_at_50%_0%,#14303c,transparent_60%)] px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <LogoPlataforma />
          <p className="mt-3 text-center text-sm text-texto-suave">Painel da plataforma</p>
        </div>
        <div className="painel p-6">
          <h1 className="titulo text-xl">Entrar</h1>
          <FormLoginPlataforma />
        </div>
      </div>
    </main>
  );
}
