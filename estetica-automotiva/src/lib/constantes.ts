// Arquivo sem dependência de servidor: pode ser importado em Client Components.
import type {
  FormaPagamento,
  StatusAgendamento,
  StatusLoja,
  TipoVeiculo,
} from "@/generated/prisma/enums";

export const TIPOS_VEICULO: TipoVeiculo[] = ["MOTO", "CARRO", "SUV", "CAMINHONETE"];

export const NOME_VEICULO: Record<TipoVeiculo, string> = {
  MOTO: "Moto",
  CARRO: "Carro",
  SUV: "SUV",
  CAMINHONETE: "Caminhonete",
};

export const EXEMPLO_VEICULO: Record<TipoVeiculo, string> = {
  MOTO: "CG, Fazer, PCX...",
  CARRO: "Hatch ou sedã",
  SUV: "Compass, Creta, T-Cross...",
  CAMINHONETE: "Hilux, S10, Ranger...",
};

// A ficha técnica do serviço é cadastrada pensando num CARRO.
// Para os outros tipos o consumo de produto é multiplicado por esses fatores.
export const MULTIPLICADOR_CONSUMO: Record<TipoVeiculo, number> = {
  MOTO: 0.5,
  CARRO: 1,
  SUV: 1.3,
  CAMINHONETE: 1.5,
};

/** Nome da plataforma (marketplace). As lojas têm o próprio nome. */
export const NOME_PLATAFORMA = "AutoCare";

export const NOME_STATUS: Record<StatusAgendamento, string> = {
  PENDENTE: "Aguardando confirmação",
  CONFIRMADO: "Confirmado",
  EM_ANDAMENTO: "Em lavagem",
  CONCLUIDO: "Concluído",
  CANCELADO: "Cancelado",
  NAO_COMPARECEU: "Não compareceu",
};

// Versão curta pras listas do painel
export const NOME_STATUS_CURTO: Record<StatusAgendamento, string> = {
  PENDENTE: "Pendente",
  CONFIRMADO: "Confirmado",
  EM_ANDAMENTO: "Em atendimento",
  CONCLUIDO: "Concluído",
  CANCELADO: "Cancelado",
  NAO_COMPARECEU: "Faltou",
};

// Classes do Tailwind para o "chip" de cada status (tema escuro)
export const COR_STATUS: Record<StatusAgendamento, string> = {
  PENDENTE: "bg-dourado/90 text-fundo ring-dourado",
  CONFIRMADO: "bg-menta/10 text-menta ring-menta/40",
  EM_ANDAMENTO: "bg-info/15 text-info ring-info/40",
  CONCLUIDO: "bg-superficie-2 text-texto ring-borda-forte",
  CANCELADO: "bg-transparent text-texto-fraco ring-borda",
  NAO_COMPARECEU: "bg-perigo/10 text-perigo ring-perigo/30",
};

// Situação da loja na plataforma (painel /plataforma)
export const STATUS_LOJA: StatusLoja[] = ["PENDENTE", "ATIVA", "SUSPENSA"];

export const NOME_STATUS_LOJA: Record<StatusLoja, string> = {
  PENDENTE: "Pendente",
  ATIVA: "Ativa",
  SUSPENSA: "Suspensa",
};

export const COR_STATUS_LOJA: Record<StatusLoja, string> = {
  PENDENTE: "bg-dourado/90 text-fundo ring-dourado",
  ATIVA: "bg-menta/10 text-menta ring-menta/40",
  SUSPENSA: "bg-perigo/10 text-perigo ring-perigo/30",
};

// Cores fixas por tipo de veículo nos gráficos (paleta validada pra fundo escuro).
// A cor segue o tipo, nunca a posição no ranking.
export const COR_VEICULO: Record<TipoVeiculo, string> = {
  CARRO: "#3987e5",
  CAMINHONETE: "#d95926",
  MOTO: "#199e70",
  SUV: "#c98500",
};

// Status que ocupam vaga na agenda
export const STATUS_ATIVOS: StatusAgendamento[] = [
  "PENDENTE",
  "CONFIRMADO",
  "EM_ANDAMENTO",
  "CONCLUIDO",
];

export const NOME_PAGAMENTO: Record<FormaPagamento, string> = {
  PIX: "Pix",
  DINHEIRO: "Dinheiro",
  CREDITO: "Cartão de crédito",
  DEBITO: "Cartão de débito",
};

export const FORMAS_PAGAMENTO: FormaPagamento[] = ["PIX", "DINHEIRO", "DEBITO", "CREDITO"];

export const CATEGORIAS_DESPESA = [
  "Aluguel",
  "Água e luz",
  "Salários",
  "Produtos",
  "Equipamentos",
  "Marketing",
  "Impostos",
  "Outros",
];

export const UNIDADES = ["ml", "g", "un"];

export const DIAS_SEMANA = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
];

export const DIAS_SEMANA_CURTO = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
export const DIAS_SEMANA_SIGLA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
