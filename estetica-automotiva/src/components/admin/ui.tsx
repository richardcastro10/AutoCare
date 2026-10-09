// Componentes visuais reaproveitados nas telas do painel
import type { ReactNode } from "react";

export function Cabecalho({
  titulo,
  descricao,
  children,
}: {
  titulo: string;
  descricao?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="titulo text-2xl">{titulo}</h1>
        {descricao && <p className="mt-1 text-sm text-texto-suave">{descricao}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

export function Carregando() {
  return (
    <div className="space-y-4" aria-busy aria-label="Carregando">
      <div className="h-8 w-56 animate-pulse rounded bg-superficie" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-superficie" />
        ))}
      </div>
      <div className="h-72 animate-pulse rounded-xl bg-superficie" />
    </div>
  );
}

const COR_ICONE = {
  menta: "bg-menta/15 text-menta",
  info: "bg-info/15 text-info",
  dourado: "bg-dourado/15 text-dourado",
  perigo: "bg-perigo/15 text-perigo",
};

/** Card de número grande (KPI) com ícone colorido, como no design */
export function Numero({
  rotulo,
  valor,
  detalhe,
  icone,
  cor = "menta",
  tom = "normal",
}: {
  rotulo: string;
  valor: ReactNode;
  detalhe?: ReactNode;
  icone?: ReactNode;
  cor?: keyof typeof COR_ICONE;
  tom?: "normal" | "alerta" | "positivo" | "negativo";
}) {
  const corValor = {
    normal: "text-texto",
    alerta: "text-dourado",
    positivo: "text-menta",
    negativo: "text-perigo",
  }[tom];
  return (
    <div className="painel flex items-center gap-4 p-4">
      {icone && (
        <span className={`grid size-12 shrink-0 place-items-center rounded-xl ${COR_ICONE[cor]}`}>{icone}</span>
      )}
      <div className="min-w-0">
        <p className="text-sm text-texto-suave">{rotulo}</p>
        <p className={`text-2xl font-semibold tabular-nums ${corValor}`}>{valor}</p>
        {detalhe && <p className="mt-0.5 text-xs text-texto-suave">{detalhe}</p>}
      </div>
    </div>
  );
}

/** Variação percentual colorida: "+18% em relação ao mês anterior" */
export function Variacao({ valor, texto }: { valor: number | null; texto: string }) {
  if (valor === null) return <span>Sem comparação ainda</span>;
  return (
    <span>
      <span className={valor >= 0 ? "text-menta" : "text-perigo"}>
        {valor >= 0 ? "+" : ""}
        {valor}%
      </span>{" "}
      {texto}
    </span>
  );
}

export function Secao({
  titulo,
  acao,
  children,
  className = "",
}: {
  titulo: string;
  acao?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`painel ${className}`}>
      <div className="flex items-center justify-between gap-2 px-4 pb-1 pt-4">
        <h2 className="font-semibold">{titulo}</h2>
        {acao}
      </div>
      {children}
    </section>
  );
}

export function Vazio({ children }: { children: ReactNode }) {
  return <p className="px-4 py-8 text-center text-sm text-texto-suave">{children}</p>;
}

export function Aviso({ tipo = "ok", children }: { tipo?: "ok" | "erro"; children: ReactNode }) {
  return (
    <p
      role={tipo === "erro" ? "alert" : "status"}
      className={`rounded-lg px-3 py-2 text-sm ${tipo === "erro" ? "bg-perigo/10 text-perigo" : "bg-menta/10 text-menta"}`}
    >
      {children}
    </p>
  );
}
