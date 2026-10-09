"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconeCaixa,
  IconeCalendario,
  IconeCarro,
  IconeCifrao,
  IconeEngrenagem,
  IconeEtiqueta,
  IconeGrafico,
  IconePainel,
  IconePessoas,
  IconeLista,
} from "@/components/icones";
import { sair } from "../login/actions";

const itens = [
  { href: "/admin", rotulo: "Dashboard", Icone: IconePainel, soDono: true },
  { href: "/admin/agendamentos", rotulo: "Agendamentos", Icone: IconeCalendario },
  { href: "/admin/clientes", rotulo: "Clientes", Icone: IconeLista },
  { href: "/admin/veiculos", rotulo: "Veículos", Icone: IconeCarro },
  { href: "/admin/servicos", rotulo: "Serviços e Preços", Icone: IconeEtiqueta, soDono: true },
  { href: "/admin/estoque", rotulo: "Estoque", Icone: IconeCaixa },
  { href: "/admin/financeiro", rotulo: "Financeiro", Icone: IconeCifrao, soDono: true },
  { href: "/admin/equipe", rotulo: "Equipe", Icone: IconePessoas, soDono: true },
  { href: "/admin/relatorios", rotulo: "Relatórios", Icone: IconeGrafico, soDono: true },
  { href: "/admin/configuracoes", rotulo: "Configurações", Icone: IconeEngrenagem },
];

export function MenuAdmin({ papel }: { papel: "ADMIN" | "FUNCIONARIO" }) {
  const pathname = usePathname();
  const visiveis = itens.filter((i) => papel === "ADMIN" || !i.soDono);

  return (
    <nav className="lg:flex-1 lg:overflow-y-auto">
      {/* no celular vira uma faixa com rolagem horizontal */}
      <ul className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:pb-0">
        {visiveis.map(({ href, rotulo, Icone }) => {
          const ativo = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
          return (
            <li key={href} className="shrink-0">
              <Link
                href={href}
                aria-current={ativo ? "page" : undefined}
                className={`flex items-center gap-3 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  ativo
                    ? "bg-menta/15 text-menta shadow-[inset_3px_0_0_var(--color-menta)]"
                    : "text-texto-suave hover:bg-superficie hover:text-texto"
                }`}
              >
                <Icone className={href === "/admin/veiculos" ? "h-4 w-6" : "size-[18px]"} />
                {rotulo}
              </Link>
            </li>
          );
        })}
        <li className="shrink-0 lg:hidden">
          <form action={sair}>
            <button className="whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium text-perigo">Sair</button>
          </form>
        </li>
      </ul>
    </nav>
  );
}
