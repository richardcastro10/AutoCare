import Link from "next/link";
import { IconeCasa, IconeLista } from "../icones";

// Menu de baixo, só nas telas "de entrada" (início e meus horários)
export function NavCliente({ ativo }: { ativo: "inicio" | "horarios" }) {
  const itens = [
    { chave: "inicio", href: "/", rotulo: "Início", Icone: IconeCasa },
    { chave: "horarios", href: "/meus-agendamentos", rotulo: "Meus horários", Icone: IconeLista },
  ] as const;

  return (
    <nav className="sticky bottom-0 z-20 mt-auto border-t border-borda bg-lateral/95 backdrop-blur">
      <ul className="grid grid-cols-2 pb-[env(safe-area-inset-bottom)]">
        {itens.map(({ chave, href, rotulo, Icone }) => (
          <li key={chave}>
            <Link
              href={href}
              aria-current={ativo === chave ? "page" : undefined}
              className={`flex flex-col items-center gap-1 py-2.5 text-xs font-medium ${
                ativo === chave ? "text-menta" : "text-texto-suave"
              }`}
            >
              <Icone className="size-6" />
              {rotulo}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
