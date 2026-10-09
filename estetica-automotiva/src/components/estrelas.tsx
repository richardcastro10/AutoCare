import { NOME_PLATAFORMA } from "@/lib/constantes";
import { formatarNota } from "@/lib/format";
import { IconeEstrela } from "./icones";

/** "★ 4,9 (328 avaliações)" */
export function NotaLoja({
  nota,
  total,
  curto,
}: {
  nota: number | null;
  total: number;
  curto?: boolean;
}) {
  if (!nota || !total) return <span className="text-sm text-texto-suave">Nova no {NOME_PLATAFORMA}</span>;
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-texto-suave">
      <IconeEstrela className="size-4 text-dourado" />
      <span className="font-medium text-texto">{formatarNota(nota)}</span>
      <span>({curto ? total : `${total} ${total === 1 ? "avaliação" : "avaliações"}`})</span>
    </span>
  );
}

/** Cinco estrelas, preenchidas até a nota */
export function Estrelas({ nota, className = "size-4" }: { nota: number; className?: string }) {
  return (
    <span className="inline-flex text-dourado" aria-label={`${nota} de 5 estrelas`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <IconeEstrela key={i} cheia={i <= Math.round(nota)} className={className} />
      ))}
    </span>
  );
}
