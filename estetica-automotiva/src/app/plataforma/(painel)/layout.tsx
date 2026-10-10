import Link from "next/link";
import { Suspense } from "react";
import { exigirPlataforma } from "@/lib/dal";
import { LogoPlataforma } from "@/components/marca";
import { IconeSair } from "@/components/icones";
import { sairPlataforma } from "../login/actions";

// Layout do painel da plataforma: uma barra no topo (são poucas telas, não precisa de menu lateral)
export default function LayoutPlataforma({ children }: LayoutProps<"/plataforma">) {
  return (
    <div className="min-h-dvh">
      <header className="flex items-center gap-4 border-b border-borda bg-lateral px-4 py-3 lg:px-8">
        <Link href="/plataforma" className="flex items-center gap-3">
          <LogoPlataforma compacto />
          <span className="rounded-full bg-superficie-2 px-2.5 py-0.5 text-xs text-texto-suave">Plataforma</span>
        </Link>
        <nav className="flex gap-1 text-sm">
          <Link href="/plataforma" className="rounded-lg px-3 py-2 text-texto-suave hover:bg-superficie hover:text-texto">
            Lojas
          </Link>
          <Link
            href="/plataforma/clientes"
            className="rounded-lg px-3 py-2 text-texto-suave hover:bg-superficie hover:text-texto"
          >
            Clientes
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-3">
          {/* depende do cookie -> dentro de Suspense */}
          <Suspense fallback={<div className="h-9 w-28" />}>
            <Conta />
          </Suspense>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 pb-10 pt-6 lg:px-8">{children}</main>
    </div>
  );
}

async function Conta() {
  const admin = await exigirPlataforma();
  return (
    <>
      <span className="hidden text-sm text-texto-suave sm:block">{admin.nome}</span>
      <form action={sairPlataforma}>
        <button className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-perigo hover:bg-superficie">
          <IconeSair className="size-4" />
          Sair
        </button>
      </form>
    </>
  );
}
