// Logo da plataforma (AutoCare) e da loja
import { NOME_PLATAFORMA } from "@/lib/constantes";

/** Silhueta de carro esportivo usada no logo */
export function SilhuetaCarro({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 40" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" className={className} aria-hidden>
      <path d="M6 30c2-6 9-9 22-10 8-7 18-12 34-12 12 0 22 4 31 11 9 1 18 3 21 9" />
      <path d="M44 19c10-1 30-1 49 0" />
    </svg>
  );
}

export function LogoPlataforma({ compacto }: { compacto?: boolean }) {
  return (
    <div className="flex flex-col items-center text-texto">
      <SilhuetaCarro className={compacto ? "h-6 w-20" : "h-9 w-28"} />
      <span className={`font-semibold tracking-tight ${compacto ? "text-xl" : "text-[2.1rem] leading-none"}`}>
        {NOME_PLATAFORMA}
      </span>
      {!compacto && <span className="mt-1 text-[10px] tracking-[0.25em] text-texto-suave">ESTÉTICAS AUTOMOTIVAS</span>}
    </div>
  );
}

/** Logo da loja: usa a imagem enviada ou o nome em dourado */
export function LogoLoja({
  nome,
  logoUrl,
  tamanho = "md",
}: {
  nome: string;
  logoUrl?: string;
  tamanho?: "sm" | "md" | "lg";
}) {
  if (logoUrl) {
    const altura = { sm: "h-8", md: "h-12", lg: "h-16" }[tamanho];
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={logoUrl} alt={nome} className={`${altura} w-auto object-contain`} />;
  }
  const texto = { sm: "text-sm", md: "text-lg", lg: "text-2xl" }[tamanho];
  return (
    <div className="flex flex-col items-center leading-none text-dourado">
      <SilhuetaCarro className={tamanho === "sm" ? "h-3 w-10" : "h-5 w-16"} />
      <span className={`mt-0.5 text-center font-extrabold uppercase ${texto}`} style={{ fontStretch: "110%" }}>
        {nome}
      </span>
    </div>
  );
}
