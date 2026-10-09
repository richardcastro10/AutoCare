// Funções utilitárias de formatação e datas.
// Sem dependência de servidor: pode ser usado em qualquer lugar.

export const FUSO = "America/Sao_Paulo";

const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/** 1990 -> "R$ 19,90" */
export function formatarMoeda(centavos: number) {
  return moeda.format(centavos / 100);
}

/** "19,90" | "19.90" | "R$ 1.234,50" -> centavos */
export function lerMoeda(texto: string) {
  const limpo = texto.replace(/[^\d,.-]/g, "");
  if (!limpo) return 0;
  // se tem vírgula, ela é o separador decimal (padrão BR)
  const normalizado = limpo.includes(",")
    ? limpo.replace(/\./g, "").replace(",", ".")
    : limpo;
  const valor = Number(normalizado);
  return Number.isFinite(valor) ? Math.round(valor * 100) : 0;
}

/** 510 -> "08:30" */
export function minutosParaHora(minutos: number) {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** "08:30" -> 510 */
export function horaParaMinutos(hora: string) {
  const [h, m] = hora.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

/** 90 -> "1h30" */
export function formatarDuracao(minutos: number) {
  if (minutos < 60) return `${minutos} min`;
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return m ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
}

/** Data de hoje no fuso de SP, no formato "YYYY-MM-DD" */
export function hojeISO() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: FUSO }).format(new Date());
}

/** Minutos desde 00:00 agora, no fuso de SP */
export function agoraEmMinutos() {
  const partes = new Intl.DateTimeFormat("en-GB", {
    timeZone: FUSO,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const h = Number(partes.find((p) => p.type === "hour")?.value ?? 0);
  const m = Number(partes.find((p) => p.type === "minute")?.value ?? 0);
  return h * 60 + m;
}

// Para fazer conta com datas "YYYY-MM-DD" usamos meio-dia UTC,
// assim nunca "pula" de dia por causa de fuso.
function paraDate(iso: string) {
  return new Date(`${iso}T12:00:00Z`);
}

export function somarDias(iso: string, dias: number) {
  const d = paraDate(iso);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/** 0 = domingo ... 6 = sábado */
export function diaDaSemana(iso: string) {
  return paraDate(iso).getUTCDay();
}

export function dataValida(iso: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) && !Number.isNaN(paraDate(iso).getTime());
}

/** "2026-10-08" -> "08/10/2026" */
export function formatarData(iso: string) {
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}

/** "2026-10-08" -> "quinta-feira, 8 de outubro" */
export function formatarDataLonga(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(paraDate(iso));
}

/** "2026-10-08" -> "8 out" */
export function formatarDataCurta(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  })
    .format(paraDate(iso))
    .replace(".", "");
}

/** "2026-10" -> "outubro de 2026" */
export function formatarMes(mes: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(paraDate(`${mes}-01`));
}

export function somarMeses(mes: string, qtd: number) {
  const [a, m] = mes.split("-").map(Number);
  const d = new Date(Date.UTC(a, m - 1 + qtd, 1, 12));
  return d.toISOString().slice(0, 7);
}

/** Último dia do mês "YYYY-MM" -> "YYYY-MM-31" */
export function fimDoMes(mes: string) {
  return somarDias(`${somarMeses(mes, 1)}-01`, -1);
}

export function formatarDataHora(data: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: FUSO,
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(data);
}

/** Date -> "08/10/2026" (no fuso de SP) */
export function formatarDia(data: Date) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, day: "2-digit", month: "2-digit", year: "numeric" }).format(data);
}

export function somenteDigitos(texto: string) {
  return texto.replace(/\D/g, "");
}

/** "13991234567" -> "(13) 99123-4567" */
export function formatarTelefone(tel: string) {
  const d = somenteDigitos(tel);
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return tel;
}

export function formatarPlaca(placa: string) {
  return placa.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 7);
}

export function formatarQuantidade(qtd: number, unidade: string) {
  const valor = Number.isInteger(qtd)
    ? qtd.toLocaleString("pt-BR")
    : qtd.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
  return `${valor} ${unidade}`;
}

export function linkWhatsApp(telefone: string, mensagem?: string) {
  const numero = somenteDigitos(telefone);
  const comPais = numero.startsWith("55") ? numero : `55${numero}`;
  const texto = mensagem ? `?text=${encodeURIComponent(mensagem)}` : "";
  return `https://wa.me/${comPais}${texto}`;
}

// ---------- Horário de funcionamento ----------

/** 480 -> "08h", 510 -> "08h30" */
export function horaCurta(minutos: number) {
  const h = String(Math.floor(minutos / 60)).padStart(2, "0");
  const m = minutos % 60;
  return m ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
}

const SIGLAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

/**
 * Resume os horários pra mostrar no card da loja.
 * Ex.: { horas: "08h às 20h", dias: "Seg a Sáb" }
 */
export function resumoHorario(horarios: { diaSemana: number; aberto: boolean; abre: number; fecha: number }[]) {
  const ordem = [1, 2, 3, 4, 5, 6, 0]; // semana começando na segunda
  const abertos = ordem.map((d) => horarios.find((h) => h.diaSemana === d)).filter((h) => h?.aberto) as {
    diaSemana: number;
    abre: number;
    fecha: number;
  }[];
  if (!abertos.length) return { horas: "Fechado", dias: "" };

  const abre = Math.min(...abertos.map((h) => h.abre));
  const fecha = Math.max(...abertos.map((h) => h.fecha));

  // agrupa dias seguidos: [seg, ter, qua] -> "Seg a Qua"
  const posicoes = abertos.map((h) => ordem.indexOf(h.diaSemana));
  const grupos: number[][] = [];
  for (const p of posicoes) {
    const ultimo = grupos.at(-1);
    if (ultimo && p === ultimo.at(-1)! + 1) ultimo.push(p);
    else grupos.push([p]);
  }
  const dias = grupos
    .map((g) => {
      const ini = SIGLAS[ordem[g[0]]];
      const fim = SIGLAS[ordem[g.at(-1)!]];
      if (g.length === 1) return ini;
      if (g.length === 2) return `${ini} e ${fim}`;
      return `${ini} a ${fim}`;
    })
    .join(", ");

  return { horas: `${horaCurta(abre)} às ${horaCurta(fecha)}`, dias };
}

// ---------- Distância ----------

/** Distância em km entre dois pontos (fórmula de Haversine) */
export function distanciaKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const rad = (g: number) => (g * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatarDistancia(km: number) {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km`;
}

/** 4.866 -> "4,9" */
export function formatarNota(nota: number) {
  return nota.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

/** "Brilho Pro Estética" -> "brilho-pro-estetica" */
export function gerarSlug(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

/** Pra buscas: ignora acento e maiúscula */
export function normalizar(texto: string) {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}
