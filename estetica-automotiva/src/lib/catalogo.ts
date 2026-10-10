// Dados que mudam pouco: lojas, serviços, preços, horários.
// Usamos "use cache" + cacheTag: o resultado fica em cache e, quando o dono altera
// algo no painel, a server action chama updateTag(tagLoja(id)) pra limpar.
import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import type { StatusLoja, TipoVeiculo } from "@/generated/prisma/enums";
import { prisma } from "./prisma";

/** Tag da lista de lojas do marketplace */
export const TAG_LOJAS = "lojas";
/** Tag de tudo que é de uma loja (config, horários, serviços, avaliações) */
export const tagLoja = (lojaId: number) => `loja-${lojaId}`;

/**
 * A loja está no ar pro cliente? Precisa das duas coisas:
 * a plataforma liberou (status ATIVA) E o dono deixou ligada (ativa).
 */
export const lojaPublicada = (loja: { status: StatusLoja; ativa: boolean }) =>
  loja.status === "ATIVA" && loja.ativa;

export type ServicoCatalogo = {
  id: number;
  nome: string;
  resumo: string;
  inclusos: string[];
  duracaoMin: number;
  imagemUrl: string;
  destaque: boolean;
  precos: Partial<Record<TipoVeiculo, number>>;
};

export type Horario = { diaSemana: number; aberto: boolean; abre: number; fecha: number };

export type LojaCompleta = {
  id: number;
  slug: string;
  nome: string;
  descricao: string;
  telefone: string;
  endereco: string;
  bairro: string;
  cidade: string;
  uf: string;
  latitude: number | null;
  longitude: number | null;
  capaUrl: string;
  logoUrl: string;
  ativa: boolean;
  status: StatusLoja;
  vagasSimultaneas: number;
  intervaloSlotMin: number;
  antecedenciaMinHoras: number;
  diasAntecedenciaMax: number;
  horarios: Horario[]; // sempre 7, índice = dia da semana
  bloqueios: { id: number; data: string; motivo: string }[];
  servicos: ServicoCatalogo[];
  nota: number | null;
  totalAvaliacoes: number;
};

// Não filtra por status: o painel da própria loja (inclusive PENDENTE) também usa.
// Quem mostra pro cliente confere lojaPublicada() antes.
export async function getLojaCompleta(lojaId: number): Promise<LojaCompleta | null> {
  "use cache";
  cacheTag(tagLoja(lojaId));
  cacheLife("hours");

  const loja = await prisma.loja.findUnique({
    where: { id: lojaId },
    include: {
      horarios: true,
      bloqueios: { orderBy: { data: "asc" } },
      servicos: {
        where: { ativo: true },
        include: { precos: true },
        orderBy: [{ ordem: "asc" }, { nome: "asc" }],
      },
    },
  });
  if (!loja) return null;

  const avaliacoes = await prisma.avaliacao.aggregate({
    where: { lojaId },
    _avg: { nota: true },
    _count: true,
  });

  const { horarios, bloqueios, servicos } = loja;
  return {
    id: loja.id,
    slug: loja.slug,
    nome: loja.nome,
    descricao: loja.descricao,
    telefone: loja.telefone,
    endereco: loja.endereco,
    bairro: loja.bairro,
    cidade: loja.cidade,
    uf: loja.uf,
    latitude: loja.latitude,
    longitude: loja.longitude,
    capaUrl: loja.capaUrl,
    logoUrl: loja.logoUrl,
    ativa: loja.ativa,
    status: loja.status,
    vagasSimultaneas: loja.vagasSimultaneas,
    intervaloSlotMin: loja.intervaloSlotMin,
    antecedenciaMinHoras: loja.antecedenciaMinHoras,
    diasAntecedenciaMax: loja.diasAntecedenciaMax,
    horarios: Array.from({ length: 7 }, (_, dia) => {
      const h = horarios.find((x) => x.diaSemana === dia);
      return h
        ? { diaSemana: dia, aberto: h.aberto, abre: h.abre, fecha: h.fecha }
        : { diaSemana: dia, aberto: false, abre: 480, fecha: 1080 };
    }),
    bloqueios: bloqueios.map(({ id, data, motivo }) => ({ id, data, motivo })),
    servicos: servicos.map((s) => ({
      id: s.id,
      nome: s.nome,
      resumo: s.resumo,
      inclusos: s.inclusos.split("\n").map((l) => l.trim()).filter(Boolean),
      duracaoMin: s.duracaoMin,
      imagemUrl: s.imagemUrl,
      destaque: s.destaque,
      precos: Object.fromEntries(s.precos.map((p) => [p.tipoVeiculo, p.preco])),
    })),
    nota: avaliacoes._avg.nota,
    totalAvaliacoes: avaliacoes._count,
  };
}

/**
 * /loja/[slug] -> id da loja + se ela está no ar (o slug não muda depois de criado).
 * Devolve null só quando o slug não existe.
 */
export async function getSituacaoPorSlug(slug: string): Promise<{ id: number; publicada: boolean } | null> {
  "use cache";
  cacheTag(TAG_LOJAS);
  cacheLife("hours");
  const loja = await prisma.loja.findUnique({ where: { slug }, select: { id: true, ativa: true, status: true } });
  return loja ? { id: loja.id, publicada: lojaPublicada(loja) } : null;
}

/** Id da loja pelo slug, só se ela estiver no ar (status ATIVA e ligada pelo dono) */
export async function getLojaIdPorSlug(slug: string): Promise<number | null> {
  const situacao = await getSituacaoPorSlug(slug);
  return situacao?.publicada ? situacao.id : null;
}

export async function getLojaPorSlug(slug: string) {
  const id = await getLojaIdPorSlug(slug);
  return id ? getLojaCompleta(id) : null;
}

export type LojaResumo = {
  id: number;
  slug: string;
  nome: string;
  bairro: string;
  cidade: string;
  uf: string;
  latitude: number | null;
  longitude: number | null;
  capaUrl: string;
  logoUrl: string;
  telefone: string; // WhatsApp da loja (público: aparece na página da loja)
  nota: number | null;
  totalAvaliacoes: number;
  precoMinimo: number | null;
  servicos: string[];
};

/** Lista do marketplace (tela inicial do cliente) */
export async function getLojasAtivas(): Promise<LojaResumo[]> {
  "use cache";
  cacheTag(TAG_LOJAS);
  cacheLife("hours");

  const [lojas, notas] = await Promise.all([
    prisma.loja.findMany({
      // só aparece no marketplace loja aprovada pela plataforma, ligada pelo dono
      // e com pelo menos um serviço
      where: { status: "ATIVA", ativa: true, servicos: { some: { ativo: true } } },
      include: {
        servicos: { where: { ativo: true }, select: { nome: true, precos: { select: { preco: true } } } },
      },
      orderBy: { nome: "asc" },
    }),
    prisma.avaliacao.groupBy({ by: ["lojaId"], _avg: { nota: true }, _count: true }),
  ]);

  return lojas.map((l) => {
    const precos = l.servicos.flatMap((s) => s.precos.map((p) => p.preco));
    const nota = notas.find((n) => n.lojaId === l.id);
    return {
      id: l.id,
      slug: l.slug,
      nome: l.nome,
      bairro: l.bairro,
      cidade: l.cidade,
      uf: l.uf,
      latitude: l.latitude,
      longitude: l.longitude,
      capaUrl: l.capaUrl,
      logoUrl: l.logoUrl,
      telefone: l.telefone,
      nota: nota?._avg.nota ?? null,
      totalAvaliacoes: nota?._count ?? 0,
      precoMinimo: precos.length ? Math.min(...precos) : null,
      servicos: l.servicos.map((s) => s.nome),
    };
  });
}

export type AvaliacaoPublica = {
  id: number;
  nota: number;
  comentario: string;
  data: string; // ISO
  autor: string; // "Ana S."
  servico: string;
};

/** Avaliações da loja (as 30 mais recentes) + quantas de cada nota */
export async function getAvaliacoes(lojaId: number) {
  "use cache";
  cacheTag(tagLoja(lojaId));
  cacheLife("hours");

  const [lista, porNota] = await Promise.all([
    prisma.avaliacao.findMany({
      where: { lojaId },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        id: true,
        nota: true,
        comentario: true,
        createdAt: true,
        cliente: { select: { nome: true } },
        agendamento: { select: { itens: { select: { nomeServico: true } } } },
      },
    }),
    prisma.avaliacao.groupBy({ by: ["nota"], where: { lojaId }, _count: true }),
  ]);

  return {
    lista: lista.map<AvaliacaoPublica>((a) => {
      const [primeiro, ...resto] = a.cliente.nome.split(" ");
      return {
        id: a.id,
        nota: a.nota,
        comentario: a.comentario,
        data: a.createdAt.toISOString(),
        // por privacidade, só o primeiro nome + inicial do sobrenome
        autor: resto.length ? `${primeiro} ${resto.at(-1)![0]}.` : primeiro,
        servico: a.agendamento.itens.map((i) => i.nomeServico).join(" + "),
      };
    }),
    porNota: [5, 4, 3, 2, 1].map((nota) => ({
      nota,
      quantidade: porNota.find((p) => p.nota === nota)?._count ?? 0,
    })),
  };
}
