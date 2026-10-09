import Link from "next/link";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { exigirAdmin } from "@/lib/dal";
import { formatarDataLonga, hojeISO } from "@/lib/format";
import { LogoLoja } from "@/components/marca";
import { IconeBaixo, IconeCalendario, IconeSair, IconeSino } from "@/components/icones";
import { sair } from "../login/actions";
import { MenuAdmin } from "./menu";

export default function LayoutPainel({ children }: LayoutProps<"/admin">) {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="border-borda bg-lateral lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col lg:border-r">
        {/* tudo aqui depende do usuário logado (cookie) -> dentro de Suspense */}
        <Suspense fallback={<div className="h-28 lg:flex-1" />}>
          <Lateral />
        </Suspense>
      </aside>

      <div className="min-w-0">
        <header className="flex items-center justify-end gap-3 px-4 pt-4 lg:px-8 lg:pt-6">
          <Suspense fallback={<div className="h-10" />}>
            <Topo />
          </Suspense>
        </header>
        <main className="px-4 pb-10 pt-4 lg:px-8">
          <Suspense fallback={null}>
            <AvisoEmAnalise />
          </Suspense>
          {children}
        </main>
      </div>
    </div>
  );
}

/** Loja PENDENTE: o dono usa o painel normalmente, mas vê esse aviso em todas as telas */
async function AvisoEmAnalise() {
  const usuario = await exigirAdmin();
  if (usuario.loja.status !== "PENDENTE") return null;
  return (
    <p
      role="status"
      className="sticky top-2 z-30 mb-4 rounded-lg border border-dourado/50 bg-[#2a2413] px-4 py-2.5 text-sm font-medium text-dourado shadow-lg shadow-black/30"
    >
      Sua loja está em análise. Ela aparece no app assim que for aprovada.
    </p>
  );
}

async function Lateral() {
  const usuario = await exigirAdmin();
  const inicial = usuario.nome.trim().charAt(0).toUpperCase();

  return (
    <>
      <Link href="/admin" className="flex justify-center px-4 py-5 lg:py-7">
        <LogoLoja nome={usuario.loja.nome} logoUrl={usuario.loja.logoUrl} />
      </Link>

      <MenuAdmin papel={usuario.papel} />

      <details className="group relative m-3 hidden lg:block">
        <summary className="flex cursor-pointer list-none items-center gap-3 rounded-xl border border-borda bg-superficie px-3 py-2.5 hover:border-borda-forte">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-superficie-2 font-semibold">{inicial}</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{usuario.nome}</span>
            <span className="text-xs text-texto-suave">{usuario.papel === "ADMIN" ? "Administrador" : "Funcionário"}</span>
          </span>
          <IconeBaixo className="size-4 text-texto-suave transition-transform group-open:rotate-180" />
        </summary>
        <div className="absolute inset-x-0 bottom-full mb-2 overflow-hidden rounded-xl border border-borda-forte bg-superficie-2 text-sm shadow-lg shadow-black/30">
          <Link href={`/loja/${usuario.loja.slug}`} target="_blank" className="block px-4 py-2.5 hover:bg-superficie">
            Ver minha página no app
          </Link>
          <Link href="/admin/configuracoes" className="block px-4 py-2.5 hover:bg-superficie">
            Configurações e senha
          </Link>
          <form action={sair}>
            <button className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-perigo hover:bg-superficie">
              <IconeSair className="size-4" />
              Sair
            </button>
          </form>
        </div>
      </details>
    </>
  );
}

async function Topo() {
  const usuario = await exigirAdmin();
  const hoje = hojeISO();
  const pendentes = await prisma.agendamento.count({
    where: { lojaId: usuario.lojaId, status: "PENDENTE", data: { gte: hoje } },
  });
  const inicial = usuario.loja.nome.trim().charAt(0).toUpperCase();

  return (
    <>
      <Link
        href={`/admin/agendamentos?data=${hoje}`}
        className="hidden items-center gap-2 rounded-lg border border-borda bg-superficie px-3 py-2 text-sm sm:flex"
      >
        <IconeCalendario className="size-4 text-texto-suave" />
        <span className="first-letter:uppercase">Hoje, {formatarDataLonga(hoje).split(", ")[1]}</span>
      </Link>
      <Link
        href="/admin/agendamentos"
        className="relative grid size-10 place-items-center rounded-lg hover:bg-superficie"
        aria-label={pendentes ? `${pendentes} agendamentos esperando confirmação` : "Nenhuma pendência"}
      >
        <IconeSino className="size-5" />
        {pendentes > 0 && (
          <span className="absolute right-1 top-1 grid min-w-4 place-items-center rounded-full bg-perigo px-1 text-[10px] font-bold text-white">
            {pendentes}
          </span>
        )}
      </Link>
      <div className="flex items-center gap-2.5">
        <span className="grid size-9 place-items-center rounded-full bg-superficie-2 text-sm font-semibold">{inicial}</span>
        <span className="hidden text-sm sm:block">{usuario.loja.nome}</span>
      </div>
    </>
  );
}
