// Mostra a foto enviada pelo painel. Sem foto, mostra um fundo padrão com ícone.
import { IconeCarro } from "./icones";

export function Foto({
  src,
  alt,
  className = "",
}: {
  src?: string | null;
  alt: string;
  className?: string;
}) {
  if (src) {
    // <img> simples: as fotos já chegam otimizadas (WebP redimensionado no upload)
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} className={`object-cover ${className}`} loading="lazy" />;
  }
  return (
    <div
      role="img"
      aria-label={alt}
      className={`grid place-items-center bg-[radial-gradient(circle_at_30%_20%,#1d3443,#0b1720_70%)] ${className}`}
    >
      <IconeCarro className="h-1/3 max-h-16 w-1/2 max-w-32 text-menta/35" />
    </div>
  );
}
