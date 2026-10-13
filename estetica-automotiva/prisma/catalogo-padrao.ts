// Catálogo padrão: os 10 produtos e os 7 serviços (com preço por tipo de veículo e
// ficha técnica) que toda loja nova recebe nos scripts de banco.
// Usado por prisma/seed.ts (demo, com produtos e ficha técnica) e prisma/seed-molinari.ts
// (produção: só os serviços e preços, sem ficha técnica).
import type { TipoVeiculo } from "../src/generated/prisma/enums";

/** R$ -> centavos */
export const reais = (v: number) => Math.round(v * 100);


// preco = valor de UMA embalagem em reais; tamanho e minimo na unidade do produto
export const PRODUTOS = [
  { nome: "Shampoo automotivo neutro", unidade: "ml", tamanho: 5000, preco: 89.9, minimo: 3000 },
  { nome: "Limpador multiuso (APC)", unidade: "ml", tamanho: 5000, preco: 79.9, minimo: 2000 },
  { nome: "Pretinho para pneus", unidade: "ml", tamanho: 1000, preco: 34.9, minimo: 1000 },
  { nome: "Cera de carnaúba", unidade: "ml", tamanho: 500, preco: 59.9, minimo: 400 },
  { nome: "Desengraxante para motor", unidade: "ml", tamanho: 5000, preco: 69.9, minimo: 1500 },
  { nome: "Limpador de estofados", unidade: "ml", tamanho: 1000, preco: 49.9, minimo: 1000 },
  { nome: "Hidratante de couro", unidade: "ml", tamanho: 500, preco: 64.9, minimo: 300 },
  { nome: "Composto polidor de corte", unidade: "ml", tamanho: 1000, preco: 119.9, minimo: 300 },
  { nome: "Vitrificador de pintura", unidade: "ml", tamanho: 50, preco: 189.9, minimo: 30 },
  { nome: "Aromatizante", unidade: "un", tamanho: 1, preco: 4.5, minimo: 20 },
];

export type ServicoBase = {
  nome: string;
  resumo: string;
  inclusos: string[];
  duracao: number;
  destaque?: boolean;
  precos: Partial<Record<TipoVeiculo, number>>;
  insumos: [string, number][];
};

export const SERVICOS: Record<string, ServicoBase> = {
  basica: {
    nome: "Lavagem básica",
    resumo: "Limpeza externa",
    inclusos: ["Lavagem externa com shampoo neutro", "Limpeza de rodas e pneus", "Secagem com toalha de microfibra", "Pretinho nos pneus"],
    duracao: 40,
    precos: { MOTO: 30, CARRO: 40, SUV: 50, CAMINHONETE: 60 },
    insumos: [["Shampoo", 150], ["Pretinho", 40]],
  },
  premium: {
    nome: "Lavagem premium",
    resumo: "Limpeza completa + cera",
    inclusos: ["Lavagem externa completa", "Limpeza de rodas e pneus", "Aplicação de cera automotiva", "Aspiração interna", "Limpeza de vidros", "Finalização profissional"],
    duracao: 90,
    destaque: true,
    precos: { MOTO: 50, CARRO: 70, SUV: 85, CAMINHONETE: 95 },
    insumos: [["Shampoo", 150], ["Limpador multiuso", 100], ["Pretinho", 40], ["Cera", 40], ["Aromatizante", 1]],
  },
  higienizacao: {
    nome: "Higienização interna",
    resumo: "Bancos, carpetes e teto",
    inclusos: ["Aspiração completa", "Limpeza de bancos com extratora", "Limpeza de carpetes e teto", "Limpeza de painel e portas", "Aromatização"],
    duracao: 120,
    precos: { CARRO: 120, SUV: 150, CAMINHONETE: 160 },
    insumos: [["Limpador de estofados", 250], ["Limpador multiuso", 200], ["Aromatizante", 1]],
  },
  motor: {
    nome: "Lavagem de motor",
    resumo: "Desengraxe do cofre",
    inclusos: ["Proteção dos componentes elétricos", "Desengraxe do cofre do motor", "Enxágue com baixa pressão", "Revitalização de plásticos"],
    duracao: 40,
    precos: { MOTO: 40, CARRO: 60, SUV: 70, CAMINHONETE: 80 },
    insumos: [["Desengraxante", 300]],
  },
  couro: {
    nome: "Hidratação de couro",
    resumo: "Limpeza e hidratação dos bancos",
    inclusos: ["Limpeza do couro com produto neutro", "Hidratação de bancos e volante", "Proteção contra ressecamento"],
    duracao: 60,
    precos: { CARRO: 150, SUV: 180, CAMINHONETE: 180 },
    insumos: [["Hidratante", 60]],
  },
  polimento: {
    nome: "Polimento técnico",
    resumo: "Remove riscos leves",
    inclusos: ["Lavagem técnica", "Descontaminação da pintura", "Polimento de corte e refino", "Proteção com cera"],
    duracao: 240,
    precos: { MOTO: 250, CARRO: 450, SUV: 550, CAMINHONETE: 600 },
    insumos: [["Shampoo", 150], ["Composto polidor", 120], ["Cera", 40]],
  },
  vitrificacao: {
    nome: "Vitrificação de pintura",
    resumo: "Proteção cerâmica até 2 anos",
    inclusos: ["Lavagem técnica e descontaminação", "Polimento de preparação", "Aplicação de vitrificador cerâmico", "Cura e inspeção final"],
    duracao: 360,
    precos: { MOTO: 600, CARRO: 1200, SUV: 1500, CAMINHONETE: 1600 },
    insumos: [["Shampoo", 150], ["Composto polidor", 120], ["Vitrificador", 30]],
  },
};
