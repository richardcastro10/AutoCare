// Gráficos feitos à mão com SVG + HTML (sem biblioteca).
// Linha e barras usam uma cor só (menta); a rosca usa uma cor fixa por tipo de veículo.
import type { ReactNode } from "react";
import { formatarMoeda } from "@/lib/format";

/** "R$ 6k" pra eixo */
function moedaCurta(centavos: number) {
  const reais = centavos / 100;
  if (reais >= 1000) return `R$ ${(reais / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}k`;
  return `R$ ${Math.round(reais)}`;
}

/** Passo "bonito" do eixo (em centavos) pra caber o máximo em 3 faixas */
function passoBonito(maximo: number) {
  const passos = [5000, 10000, 20000, 25000, 50000, 100000, 200000, 250000, 500000, 1000000, 2000000, 5000000];
  return passos.find((p) => maximo <= p * 3) ?? 10000000;
}

export function LinhaFaturamento({ dados }: { dados: { rotulo: string; detalhe: string; valor: number }[] }) {
  // loja nova (ou período parado): em vez de uma linha reta no zero, uma mensagem
  if (dados.every((d) => d.valor === 0)) {
    return <SemDados>Nenhum faturamento nesse período ainda. Ele aparece aqui quando você concluir serviços.</SemDados>;
  }
  const passo = passoBonito(Math.max(...dados.map((d) => d.valor), 1));
  const topo = passo * 3;
  const marcas = [3, 2, 1, 0].map((n) => n * passo);
  const x = (i: number) => (dados.length === 1 ? 50 : (i / (dados.length - 1)) * 100);
  const y = (v: number) => 100 - (v / topo) * 100;
  const pontos = dados.map((d, i) => `${x(i)},${y(d.valor)}`).join(" ");
  const mostrarRotulo = (i: number) => dados.length <= 10 || i % Math.ceil(dados.length / 7) === 0 || i === dados.length - 1;

  return (
    <div className="flex gap-3">
      <div className="flex h-44 w-12 shrink-0 flex-col justify-between text-right text-[11px] tabular-nums text-texto-suave">
        {marcas.map((m) => (
          <span key={m} className="-translate-y-1/2 first:translate-y-0 last:translate-y-0">
            {moedaCurta(m)}
          </span>
        ))}
      </div>
      <div className="min-w-0 flex-1">
        <div className="relative h-44">
          {marcas.map((m) => (
            <div key={m} className="absolute inset-x-0 border-t border-borda/70" style={{ top: `${y(m)}%` }} />
          ))}
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible" aria-hidden>
            <defs>
              <linearGradient id="area-faturamento" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="var(--color-menta)" stopOpacity="0.28" />
                <stop offset="100%" stopColor="var(--color-menta)" stopOpacity="0" />
              </linearGradient>
            </defs>
            <polygon points={`0,100 ${pontos} 100,100`} fill="url(#area-faturamento)" />
            <polyline
              points={pontos}
              fill="none"
              stroke="var(--color-menta)"
              strokeWidth={2}
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          {/* pontos com tooltip (área de toque maior que o ponto) */}
          {dados.map((d, i) => (
            <div
              key={i}
              className="group absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${x(i)}%`, top: `${y(d.valor)}%` }}
            >
              <span className="grid size-6 place-items-center" tabIndex={0} aria-label={`${d.detalhe}: ${formatarMoeda(d.valor)}`}>
                <span className="size-2 rounded-full bg-menta ring-2 ring-superficie group-hover:size-3 group-focus-within:size-3" />
              </span>
              <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-borda-forte bg-superficie-2 px-2 py-1 text-xs group-hover:block group-focus-within:block">
                <span className="text-texto-suave">{d.detalhe}</span> <strong className="tabular-nums">{formatarMoeda(d.valor)}</strong>
              </span>
            </div>
          ))}
        </div>
        <div className="relative mt-2 h-4 text-[11px] text-texto-suave">
          {dados.map((d, i) =>
            mostrarRotulo(i) ? (
              <span
                key={i}
                className="absolute -translate-x-1/2 whitespace-nowrap first:translate-x-0 last:-translate-x-full"
                style={{ left: `${x(i)}%` }}
              >
                {d.rotulo}
              </span>
            ) : null,
          )}
        </div>
      </div>
    </div>
  );
}

export function Rosca({
  itens,
  rotuloTotal,
}: {
  itens: { rotulo: string; valor: number; cor: string }[];
  rotuloTotal: string;
}) {
  const total = itens.reduce((t, i) => t + i.valor, 0);
  if (total === 0) return <SemDados>Nenhum veículo atendido no mês ainda.</SemDados>;
  const raio = 40;
  const circunferencia = 2 * Math.PI * raio;
  const espaco = itens.filter((i) => i.valor > 0).length > 1 ? 1.2 : 0; // fresta entre as fatias
  let acumulado = 0;

  return (
    <div className="flex flex-wrap items-center gap-6">
      <div className="relative size-36 shrink-0">
        <svg viewBox="0 0 100 100" className="size-full -rotate-90" role="img" aria-label={`${total} ${rotuloTotal}`}>
          <circle cx="50" cy="50" r={raio} fill="none" stroke="var(--color-superficie-2)" strokeWidth={11} />
          {total > 0 &&
            itens.map((item) => {
              const tamanho = (item.valor / total) * circunferencia;
              const inicio = acumulado;
              acumulado += tamanho;
              if (!item.valor) return null;
              return (
                <circle
                  key={item.rotulo}
                  cx="50"
                  cy="50"
                  r={raio}
                  fill="none"
                  stroke={item.cor}
                  strokeWidth={11}
                  strokeDasharray={`${Math.max(tamanho - espaco, 0.5)} ${circunferencia}`}
                  strokeDashoffset={-inicio}
                >
                  <title>{`${item.rotulo}: ${item.valor}`}</title>
                </circle>
              );
            })}
        </svg>
        <div className="absolute inset-0 grid place-content-center text-center">
          <span className="text-2xl font-semibold tabular-nums">{total}</span>
          <span className="text-xs text-texto-suave">{rotuloTotal}</span>
        </div>
      </div>
      <ul className="min-w-40 flex-1 space-y-2.5 text-sm">
        {itens.map((item) => (
          <li key={item.rotulo} className="flex items-center gap-2">
            <span className="size-2.5 shrink-0 rounded-full" style={{ background: item.cor }} />
            <span className="flex-1">{item.rotulo}</span>
            <span className="tabular-nums text-texto-suave">
              {item.valor} ({total ? Math.round((item.valor / total) * 100) : 0}%)
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Gráfico sem nenhum dado: mensagem no lugar do desenho (mesma altura aproximada) */
function SemDados({ children }: { children: ReactNode }) {
  return (
    <p className="grid min-h-36 place-items-center rounded-lg border border-dashed border-borda px-4 text-center text-sm text-texto-suave">
      {children}
    </p>
  );
}

export function BarrasHorizontais({
  itens,
}: {
  itens: { rotulo: string; valor: number; texto: string; extra?: string }[];
}) {
  const maximo = Math.max(...itens.map((i) => i.valor), 1);
  const temExtra = itens.some((i) => i.extra);
  return (
    <ul className="space-y-3.5">
      {itens.map((i) => (
        <li
          key={i.rotulo}
          className={`grid items-center gap-3 text-sm ${
            temExtra
              ? "grid-cols-[minmax(0,1.4fr)_minmax(2.5rem,1fr)_auto_2.5rem]"
              : "grid-cols-[minmax(0,1.4fr)_minmax(2.5rem,1fr)_auto]"
          }`}
        >
          <span className="truncate" title={i.rotulo}>
            {i.rotulo}
          </span>
          <span className="h-1.5 rounded-full bg-superficie-2">
            <span className="block h-1.5 rounded-full bg-menta" style={{ width: `${(i.valor / maximo) * 100}%` }} />
          </span>
          <span className="whitespace-nowrap text-right tabular-nums">{i.texto}</span>
          {temExtra && <span className="text-right tabular-nums text-texto-suave">{i.extra}</span>}
        </li>
      ))}
    </ul>
  );
}
