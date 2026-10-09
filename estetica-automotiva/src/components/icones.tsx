// Ícones desenhados à mão em SVG (sem biblioteca). Usam currentColor.
import type { SVGProps } from "react";
import type { TipoVeiculo } from "@/generated/prisma/enums";

type Props = SVGProps<SVGSVGElement>;

const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function IconeMoto(props: Props) {
  return (
    <svg viewBox="0 0 48 24" {...base} {...props}>
      <circle cx="10" cy="17" r="5" />
      <circle cx="38" cy="17" r="5" />
      <path d="M10 17 18 9h10l4 4 6 4M18 9l-2-3h-4M28 9l3-4h4M21 9l3 5h8" />
    </svg>
  );
}

export function IconeCarro(props: Props) {
  return (
    <svg viewBox="0 0 48 24" {...base} {...props}>
      <path d="M9.5 18H4v-4.5C4 12 5 11 6.5 10.8L12 10l5-4.2c.8-.6 1.8-.8 2.8-.8H31c1.2 0 2.3.4 3.2 1.1L40 10l4.2.9c1.1.3 1.8 1.2 1.8 2.3V18h-5.5M16.5 18h17" />
      <circle cx="13" cy="18" r="3.5" />
      <circle cx="37" cy="18" r="3.5" />
      <path d="M12 10h28" />
    </svg>
  );
}

export function IconeSuv(props: Props) {
  return (
    <svg viewBox="0 0 48 24" {...base} {...props}>
      <path d="M9.5 18H4v-7c0-1.2.9-2.1 2-2.2L10 8.5l3.6-4.4c.6-.7 1.4-1.1 2.3-1.1H36c1 0 1.9.5 2.4 1.3L42 9c2.3.3 4 1.4 4 3.3V18h-5.5M16.5 18h17" />
      <circle cx="13" cy="18" r="3.5" />
      <circle cx="37" cy="18" r="3.5" />
      <path d="M10 8.5h32M25 3v5.5" />
    </svg>
  );
}

export function IconeCaminhonete(props: Props) {
  return (
    <svg viewBox="0 0 48 24" {...base} {...props}>
      <path d="M8.5 18H3v-6.5c0-.8.7-1.5 1.5-1.5H22V5c0-.9.7-1.6 1.6-1.6H32c.9 0 1.8.4 2.4 1.2L39 10c3.5.3 6 1.4 6 3.5V18h-5.5M15.5 18h18" />
      <circle cx="12" cy="18" r="3.5" />
      <circle cx="36.5" cy="18" r="3.5" />
      <path d="M22 10h17" />
    </svg>
  );
}

export function IconeVeiculo({ tipo, ...props }: Props & { tipo: TipoVeiculo }) {
  switch (tipo) {
    case "MOTO":
      return <IconeMoto {...props} />;
    case "SUV":
      return <IconeSuv {...props} />;
    case "CAMINHONETE":
      return <IconeCaminhonete {...props} />;
    default:
      return <IconeCarro {...props} />;
  }
}

export function IconeRelogio(props: Props) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

export function IconeLocal(props: Props) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </svg>
  );
}

export function IconeConversa(props: Props) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <path d="M4 19.5 5.3 16A8 8 0 1 1 8 18.7Z" />
      <path d="M9 10.5c.5 2 2.4 3.9 4.5 4.5l1.3-1.3 2 1-.5 1.6c-3.8.3-8.2-4-8-8l1.6-.5 1 2Z" />
    </svg>
  );
}

export function IconeCalendario(props: Props) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <rect x="3.5" y="5" width="17" height="15" rx="2" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </svg>
  );
}

export function IconeCasa(props: Props) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <path d="M4 10.5 12 4l8 6.5V20h-5v-6H9v6H4Z" />
    </svg>
  );
}

export function IconeLista(props: Props) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" />
    </svg>
  );
}

export function IconeCheck(props: Props) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </svg>
  );
}

export function IconeVoltar(props: Props) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <path d="M15 5l-7 7 7 7" />
    </svg>
  );
}

export function IconeMais(props: Props) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function IconeGota(props: Props) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <path
        d="M12 2.5C9 6.7 6.2 10.2 6.2 13.5a5.8 5.8 0 0 0 11.6 0c0-3.3-2.8-6.8-5.8-11Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function IconeVoltarSeta(props: Props) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <path d="M19 12H5M11 6l-6 6 6 6" />
    </svg>
  );
}

export function IconeSeta(props: Props) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <path d="m9 5 7 7-7 7" />
    </svg>
  );
}

export function IconeBaixo(props: Props) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export function IconeBusca(props: Props) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-4.2-4.2" />
    </svg>
  );
}

export function IconeMira(props: Props) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <circle cx="12" cy="12" r="7.5" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22" />
    </svg>
  );
}

export function IconeEstrela({ cheia = true, ...props }: Props & { cheia?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <path
        d="m12 3.2 2.7 5.5 6 .9-4.35 4.25 1 6L12 17l-5.35 2.85 1-6L3.3 9.6l6-.9Z"
        fill={cheia ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconeCoracao({ cheio, ...props }: Props & { cheio?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <path
        d="M12 20s-7.5-4.6-7.5-10.1A4.4 4.4 0 0 1 12 7a4.4 4.4 0 0 1 7.5 2.9C19.5 15.4 12 20 12 20Z"
        fill={cheio ? "currentColor" : "none"}
      />
    </svg>
  );
}

export function IconeCarteira(props: Props) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <path d="M4 7.5h14a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" />
      <path d="M4 7.5 15.5 4v3.5M16 13.75h.01" />
    </svg>
  );
}

export function IconeSino(props: Props) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <path d="M6 16.5V11a6 6 0 1 1 12 0v5.5l1.5 1.5h-15ZM10 20.5a2 2 0 0 0 4 0" />
    </svg>
  );
}

export function IconeCifrao(props: Props) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <path d="M12 3v18M16.5 7.5c-.6-1.4-2.3-2.3-4.5-2.3-2.6 0-4.4 1.3-4.4 3.2 0 4.6 9.3 2.5 9.3 7.2 0 2-1.9 3.4-4.9 3.4-2.4 0-4.2-1-4.9-2.6" />
    </svg>
  );
}

export function IconeCheckCirculo(props: Props) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m8.5 12.3 2.4 2.4 4.7-5" />
    </svg>
  );
}

export function IconeCaixa(props: Props) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <path d="m12 3 8 4.2v9.6L12 21l-8-4.2V7.2Z" />
      <path d="m4 7.2 8 4.3 8-4.3M12 11.5V21M8 5.1l8 4.3" />
    </svg>
  );
}

export function IconeCamera(props: Props) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2.2l1.5-2h5.6l1.5 2h2.2A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5Z" />
      <circle cx="12" cy="12.75" r="3.25" />
    </svg>
  );
}

export function IconePessoas(props: Props) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <circle cx="9" cy="8.5" r="3.5" />
      <path d="M3 19.5c.6-3.2 3-5 6-5s5.4 1.8 6 5M15.5 5.3a3.5 3.5 0 0 1 0 6.4M17.5 14.8c1.8.6 3 2.2 3.5 4.7" />
    </svg>
  );
}

export function IconeGrafico(props: Props) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <path d="M4 4v16h16M8 16v-4M12 16V8M16 16v-6" />
    </svg>
  );
}

export function IconePainel(props: Props) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <rect x="4" y="4" width="6.5" height="7.5" rx="1.2" />
      <rect x="13.5" y="4" width="6.5" height="4.5" rx="1.2" />
      <rect x="4" y="14.5" width="6.5" height="5.5" rx="1.2" />
      <rect x="13.5" y="11.5" width="6.5" height="8.5" rx="1.2" />
    </svg>
  );
}

export function IconeEtiqueta(props: Props) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <path d="M4 12.6V5a1 1 0 0 1 1-1h7.6l7.7 7.7a1 1 0 0 1 0 1.4l-7.2 7.2a1 1 0 0 1-1.4 0Z" />
      <circle cx="8.5" cy="8.5" r="1.3" />
    </svg>
  );
}

export function IconeEngrenagem(props: Props) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 13.5a7.6 7.6 0 0 0 0-3l2-1.6-2-3.4-2.4.9a7.5 7.5 0 0 0-2.6-1.5L14 2.5h-4l-.4 2.4A7.5 7.5 0 0 0 7 6.4l-2.4-.9-2 3.4 2 1.6a7.6 7.6 0 0 0 0 3l-2 1.6 2 3.4 2.4-.9a7.5 7.5 0 0 0 2.6 1.5l.4 2.4h4l.4-2.4a7.5 7.5 0 0 0 2.6-1.5l2.4.9 2-3.4Z" />
    </svg>
  );
}

export function IconeSair(props: Props) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4M9 16l-4-4 4-4M5 12h11" />
    </svg>
  );
}
