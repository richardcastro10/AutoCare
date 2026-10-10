import Link from "next/link";
import { Suspense } from "react";
import { clienteAtual } from "@/lib/dal";
import { IconeCasa, IconeLista, IconePessoas } from "../icones";

type Aba = "inicio" | "horarios" | "conta";

// Menu de baixo, nas telas "de entrada" (início, meus horários e conta)
export function NavCliente({ ativo }: { ativo: Aba }) {
  return (
    <nav className="sticky bottom-0 z-20 mt-auto border-t border-borda bg-lateral/95 backdrop-blur">
      <ul className="grid grid-cols-3 pb-[env(safe-area-inset-bottom)]">
        <Item href="/" rotulo="Início" Icone={IconeCasa} ativo={ativo === "inicio"} />
        <Item href="/meus-agendamentos" rotulo="Meus horários" Icone={IconeLista} ativo={ativo === "horarios"} />
        {/* "Entrar" ou "Minha conta" depende do cookie: fica dentro de Suspense */}
        <Suspense fallback={<Item href="/conta" rotulo="Conta" Icone={IconePessoas} ativo={ativo === "conta"} />}>
          <ItemConta ativo={ativo === "conta"} />
        </Suspense>
      </ul>
    </nav>
  );
}

async function ItemConta({ ativo }: { ativo: boolean }) {
  const cliente = await clienteAtual();
  return cliente ? (
    <Item href="/conta" rotulo="Minha conta" Icone={IconePessoas} ativo={ativo} />
  ) : (
    <Item href="/conta/entrar" rotulo="Entrar" Icone={IconePessoas} ativo={ativo} />
  );
}

function Item({
  href,
  rotulo,
  Icone,
  ativo,
}: {
  href: string;
  rotulo: string;
  Icone: typeof IconeCasa;
  ativo: boolean;
}) {
  return (
    <li>
      <Link
        href={href}
        aria-current={ativo ? "page" : undefined}
        className={`flex flex-col items-center gap-1 py-2.5 text-xs font-medium ${ativo ? "text-menta" : "text-texto-suave"}`}
      >
        <Icone className="size-6" />
        {rotulo}
      </Link>
    </li>
  );
}
