// Popula o banco com dados de exemplo: rode com `npx prisma db seed`
// ATENÇÃO: apaga tudo que estiver no banco antes!
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import type {
  FormaPagamento,
  StatusAgendamento,
  TipoVeiculo,
} from "../src/generated/prisma/enums";
import { diaDaSemana, hojeISO, minutosParaHora, somarDias } from "../src/lib/format";

const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL ?? "file:./prisma/lavagem.db" }),
});

// Gerador pseudoaleatório com semente fixa: o seed sempre gera os mesmos dados
let semente = 42;
function aleatorio() {
  semente = (semente * 16807) % 2147483647;
  return (semente - 1) / 2147483646;
}
const inteiro = (min: number, max: number) => Math.floor(aleatorio() * (max - min + 1)) + min;
const sortear = <T,>(lista: T[]): T => lista[Math.floor(aleatorio() * lista.length)];
const reais = (v: number) => Math.round(v * 100);
const MULT: Record<TipoVeiculo, number> = { MOTO: 0.5, CARRO: 1, SUV: 1.3, CAMINHONETE: 1.5 };

// ---------- Catálogo base ----------

const PRODUTOS = [
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

type ServicoBase = {
  nome: string;
  resumo: string;
  inclusos: string[];
  duracao: number;
  destaque?: boolean;
  precos: Partial<Record<TipoVeiculo, number>>;
  insumos: [string, number][];
};

const SERVICOS: Record<string, ServicoBase> = {
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

type LojaBase = {
  slug: string;
  nome: string;
  descricao: string;
  telefone: string;
  endereco: string;
  bairro: string;
  cidade: string;
  latitude: number;
  longitude: number;
  horario: (dia: number) => { aberto: boolean; abre: number; fecha: number };
  servicos: (keyof typeof SERVICOS)[];
  ajustePreco: number; // multiplica a tabela base
  dono: { nome: string; email: string };
  funcionario?: { nome: string; email: string };
  movimento: [number, number]; // serviços por dia (mín, máx)
  vagas: number;
};

const LOJAS: LojaBase[] = [
  {
    slug: "brilho-pro",
    nome: "Brilho Pro Estética",
    descricao: "Estética automotiva completa no Gonzaga. Equipe treinada, produtos profissionais e sala de espera com café.",
    telefone: "13991234567",
    endereco: "Av. Ana Costa, 1000",
    bairro: "Gonzaga",
    cidade: "Santos",
    latitude: -23.9665,
    longitude: -46.3335,
    horario: (d) => ({ aberto: d !== 0, abre: 8 * 60, fecha: 20 * 60 }),
    servicos: ["basica", "premium", "higienizacao", "motor", "couro", "polimento", "vitrificacao"],
    ajustePreco: 1,
    dono: { nome: "Dono Brilho Pro", email: "admin@brilhopro.com" },
    funcionario: { nome: "Lucas (lavador)", email: "lucas@brilhopro.com" },
    movimento: [4, 9],
    vagas: 3,
  },
  {
    slug: "lava-car-ponta-da-praia",
    nome: "Lava Car Ponta da Praia",
    descricao: "Lavagem rápida e caprichada pertinho da orla. Ideal pra quem quer resolver no horário do almoço.",
    telefone: "13998765432",
    endereco: "Av. Saldanha da Gama, 300",
    bairro: "Ponta da Praia",
    cidade: "Santos",
    latitude: -23.9858,
    longitude: -46.3083,
    horario: (d) => ({ aberto: d !== 0, abre: 8 * 60, fecha: d === 6 ? 14 * 60 : 18 * 60 }),
    servicos: ["basica", "premium", "motor", "higienizacao"],
    ajustePreco: 0.9,
    dono: { nome: "Dono Lava Car", email: "admin@lavacar.com" },
    movimento: [2, 5],
    vagas: 2,
  },
  {
    slug: "spa-do-carro",
    nome: "Spa do Carro",
    descricao: "Cuidado artesanal com o seu carro. Abrimos aos domingos.",
    telefone: "13997001122",
    endereco: "Rua Frei Gaspar, 450",
    bairro: "Centro",
    cidade: "São Vicente",
    latitude: -23.9631,
    longitude: -46.3919,
    horario: (d) => ({ aberto: d !== 1, abre: 9 * 60, fecha: 19 * 60 }),
    servicos: ["basica", "premium", "higienizacao", "couro"],
    ajustePreco: 1.05,
    dono: { nome: "Dona Spa do Carro", email: "admin@spadocarro.com" },
    movimento: [1, 4],
    vagas: 2,
  },
  {
    slug: "garagem-detail",
    nome: "Garagem Detail",
    descricao: "Especialistas em polimento e vitrificação. Atendimento com hora marcada.",
    telefone: "13996554433",
    endereco: "Av. Presidente Kennedy, 2200",
    bairro: "Boqueirão",
    cidade: "Praia Grande",
    latitude: -24.0089,
    longitude: -46.4128,
    horario: (d) => ({ aberto: d >= 1 && d <= 5, abre: 9 * 60, fecha: 18 * 60 }),
    servicos: ["premium", "polimento", "vitrificacao", "couro"],
    ajustePreco: 1.2,
    dono: { nome: "Dono Garagem Detail", email: "admin@garagemdetail.com" },
    movimento: [1, 2],
    vagas: 1,
  },
];

const NOMES = [
  "Ana Souza", "Bruno Lima", "Carla Mendes", "Diego Alves", "Eduarda Rocha", "Felipe Costa",
  "Gabriela Nunes", "Henrique Dias", "Isabela Martins", "João Pedro Santos", "Karina Lopes",
  "Leonardo Ribeiro", "Mariana Teixeira", "Nicolas Ferreira", "Otávio Barros", "Paula Freitas",
  "Rafael Moreira", "Sabrina Cardoso", "Thiago Pereira", "Vanessa Gomes", "Wesley Araújo",
  "Yasmin Correia", "Caio Fernandes", "Larissa Pinto", "Marcelo Duarte", "Renata Sales",
];
const MODELOS: Record<TipoVeiculo, string[]> = {
  MOTO: ["Honda CG 160", "Yamaha MT-03", "Honda PCX", "Yamaha Fazer 250"],
  CARRO: ["Honda Civic", "Fiat Argo", "Chevrolet Onix", "Hyundai HB20", "Toyota Corolla", "VW Polo"],
  SUV: ["Jeep Compass", "Hyundai Creta", "VW T-Cross", "Jeep Renegade"],
  CAMINHONETE: ["Toyota Hilux", "Chevrolet S10", "Ford Ranger", "Fiat Toro"],
};
const COMENTARIOS: [number, string][] = [
  [5, "Carro ficou impecável, atendimento nota 10."],
  [5, "Pontuais e caprichosos. Já virei cliente."],
  [5, "Melhor lavagem da região, o brilho dura bastante."],
  [4, "Ficou muito bom, só demorou um pouco mais que o previsto."],
  [5, "Agendei pelo app e quando cheguei já estavam me esperando."],
  [4, "Bom serviço e preço justo."],
  [5, "A higienização tirou todas as manchas do banco!"],
  [3, "Serviço ok, mas esqueceram de passar pretinho no pneu."],
  [5, ""],
  [4, ""],
];

async function main() {
  console.log("Limpando banco...");
  await prisma.codigoVerificacao.deleteMany();
  await prisma.avaliacao.deleteMany();
  await prisma.movimentoEstoque.deleteMany();
  await prisma.agendamentoItem.deleteMany();
  await prisma.agendamento.deleteMany();
  await prisma.veiculo.deleteMany();
  await prisma.cliente.deleteMany();
  await prisma.loja.deleteMany(); // apaga em cascata serviços, produtos, usuários...

  const hoje = hojeISO();
  const senhaDono = await bcrypt.hash("admin123", 10);

  // dono da plataforma (login em /plataforma). upsert: mantém o mesmo id entre um seed
  // e outro, então quem já estava logado na plataforma continua logado
  console.log("Admin da plataforma...");
  await prisma.adminPlataforma.upsert({
    where: { email: "dono@autocare.com" },
    update: { nome: "Dono AutoCare", senhaHash: senhaDono },
    create: { nome: "Dono AutoCare", email: "dono@autocare.com", senhaHash: senhaDono },
  });
  const senhaFuncionario = await bcrypt.hash("lucas123", 10);

  console.log("Clientes...");
  const letras = [..."ABCDEFGHJKLMNPRSTUVWXYZ"];
  const clientes = [];
  for (const [i, nome] of NOMES.entries()) {
    const tipo: TipoVeiculo = sortear(["CARRO", "CARRO", "CARRO", "SUV", "SUV", "MOTO", "CAMINHONETE"]);
    const placa =
      sortear(letras) + sortear(letras) + sortear(letras) + inteiro(0, 9) + sortear(letras) + inteiro(10, 99);
    const cliente = await prisma.cliente.create({
      data: {
        nome,
        telefone: `1399${String(1000000 + i * 7919).slice(0, 7)}`,
        veiculos: { create: { tipo, modelo: sortear(MODELOS[tipo]), placa } },
      },
      include: { veiculos: true },
    });
    clientes.push(cliente);
  }

  let codigo = 0;
  for (const [indice, base] of LOJAS.entries()) {
    console.log(`Loja ${base.nome}...`);
    // lojas de exemplo já aprovadas há 2 meses; cada dono entrou no painel num dia diferente
    const aprovadaEm = new Date(`${somarDias(hoje, -60)}T09:00:00-03:00`);
    const ultimoAcesso = new Date(`${somarDias(hoje, -indice * 2)}T08:${10 + indice * 7}:00-03:00`);
    const loja = await prisma.loja.create({
      data: {
        slug: base.slug,
        nome: base.nome,
        descricao: base.descricao,
        telefone: base.telefone,
        endereco: base.endereco,
        bairro: base.bairro,
        cidade: base.cidade,
        latitude: base.latitude,
        longitude: base.longitude,
        vagasSimultaneas: base.vagas,
        status: "ATIVA",
        statusAlteradoEm: aprovadaEm,
        createdAt: new Date(`${somarDias(hoje, -75)}T15:00:00-03:00`),
        horarios: { create: [0, 1, 2, 3, 4, 5, 6].map((d) => ({ diaSemana: d, ...base.horario(d) })) },
        usuarios: {
          create: [
            { nome: base.dono.nome, email: base.dono.email, senhaHash: senhaDono, papel: "ADMIN" as const, ultimoAcesso },
            ...(base.funcionario
              ? [{ ...base.funcionario, senhaHash: senhaFuncionario, papel: "FUNCIONARIO" as const }]
              : []),
          ],
        },
      },
    });

    // produtos da loja
    const produtos = [];
    for (const p of PRODUTOS) {
      const criado = await prisma.produto.create({
        data: {
          lojaId: loja.id,
          nome: p.nome,
          unidade: p.unidade,
          tamanhoEmbalagem: p.tamanho,
          precoEmbalagem: reais(p.preco),
          estoqueMinimo: p.minimo,
        },
      });
      produtos.push(criado);
    }
    const listaProdutos = produtos;
    const produto = (nome: string) => listaProdutos.find((p) => p.nome.startsWith(nome))!;

    // serviços da loja
    const servicos = [];
    for (const [ordem, chave] of base.servicos.entries()) {
      const s = SERVICOS[chave];
      const criado = await prisma.servico.create({
        data: {
          lojaId: loja.id,
          nome: s.nome,
          resumo: s.resumo,
          inclusos: s.inclusos.join("\n"),
          duracaoMin: s.duracao,
          destaque: s.destaque ?? false,
          ordem,
          precos: {
            create: Object.entries(s.precos).map(([tipo, valor]) => ({
              tipoVeiculo: tipo as TipoVeiculo,
              // aplica o ajuste da loja e arredonda pra múltiplos de R$ 5
              preco: Math.round((reais(valor) * base.ajustePreco) / 500) * 500,
            })),
          },
          insumos: {
            create: s.insumos.map(([nome, qtd]) => ({ produtoId: produto(nome).id, quantidade: qtd })),
          },
        },
        include: { precos: true, insumos: true },
      });
      servicos.push(criado);
    }

    // compra inicial de estoque
    const estoque = new Map<number, number>();
    for (const p of produtos) {
      const embalagens = p.unidade === "un" ? 300 : Math.ceil((p.estoqueMinimo * 16) / p.tamanhoEmbalagem);
      const qtd = embalagens * p.tamanhoEmbalagem;
      estoque.set(p.id, qtd);
      await prisma.movimentoEstoque.create({
        data: {
          produtoId: p.id,
          tipo: "ENTRADA",
          quantidade: qtd,
          custoTotal: embalagens * p.precoEmbalagem,
          motivo: `Compra inicial (${embalagens} embalagens)`,
          createdAt: new Date(`${somarDias(hoje, -70)}T10:00:00-03:00`),
        },
      });
    }

    // agendamentos: 60 dias pra trás e 6 pra frente
    const formas: FormaPagamento[] = ["PIX", "PIX", "PIX", "DEBITO", "CREDITO", "DINHEIRO"];
    for (let d = -60; d <= 6; d++) {
      const data = somarDias(hoje, d);
      const h = base.horario(diaDaSemana(data));
      if (!h.aberto) continue;

      const [min, max] = base.movimento;
      const qtdDia = d > 0 ? inteiro(1, Math.max(1, Math.round(max / 2))) : inteiro(min, max);
      const vagas = Array.from({ length: base.vagas }, () => h.abre);

      for (let n = 0; n < qtdDia; n++) {
        const cliente = sortear(clientes);
        const veiculo = cliente.veiculos[0];
        const disponiveis = servicos.filter((s) => s.precos.some((p) => p.tipoVeiculo === veiculo.tipo));
        if (!disponiveis.length) continue;
        // serviços mais simples são os mais pedidos
        const servico =
          aleatorio() < 0.8 ? disponiveis[inteiro(0, Math.min(1, disponiveis.length - 1))] : sortear(disponiveis);

        const vaga = vagas.indexOf(Math.min(...vagas));
        const inicio = Math.ceil(vagas[vaga] / 30) * 30 + (aleatorio() < 0.3 ? 30 : 0);
        if (inicio + servico.duracaoMin > h.fecha) continue;
        vagas[vaga] = inicio + servico.duracaoMin;

        const preco = servico.precos.find((p) => p.tipoVeiculo === veiculo.tipo)!.preco;
        let status: StatusAgendamento;
        if (d < 0) {
          const r = aleatorio();
          status = r < 0.88 ? "CONCLUIDO" : r < 0.95 ? "CANCELADO" : "NAO_COMPARECEU";
        } else if (d === 0) {
          status = (["CONCLUIDO", "EM_ANDAMENTO", "CONFIRMADO", "PENDENTE"] as const)[Math.min(n, 3)];
        } else {
          status = aleatorio() < 0.5 ? "CONFIRMADO" : "PENDENTE";
        }

        const concluido = status === "CONCLUIDO";
        const desconto = concluido && aleatorio() < 0.08 ? reais(5) : 0;
        const concluidoEm = new Date(`${data}T${minutosParaHora(inicio + servico.duracaoMin)}:00-03:00`);

        const agendamento = await prisma.agendamento.create({
          data: {
            codigo: `SEED${String(codigo++).padStart(5, "0")}`,
            lojaId: loja.id,
            clienteId: cliente.id,
            veiculoId: veiculo.id,
            data,
            inicio,
            fim: inicio + servico.duracaoMin,
            status,
            total: preco,
            desconto,
            valorPago: concluido ? preco - desconto : null,
            formaPagamento: concluido ? sortear(formas) : null,
            concluidoEm: concluido ? concluidoEm : null,
            createdAt: new Date(`${somarDias(data, -inteiro(0, 3))}T09:00:00-03:00`),
            itens: {
              create: { servicoId: servico.id, nomeServico: servico.nome, preco, duracaoMin: servico.duracaoMin },
            },
          },
        });

        if (!concluido) continue;

        for (const insumo of servico.insumos) {
          const p = produtos.find((x) => x.id === insumo.produtoId)!;
          const qtd = insumo.quantidade * MULT[veiculo.tipo];
          estoque.set(p.id, estoque.get(p.id)! - qtd);
          await prisma.movimentoEstoque.create({
            data: {
              produtoId: p.id,
              tipo: "SAIDA",
              quantidade: -qtd,
              custoTotal: Math.round((qtd * p.precoEmbalagem) / p.tamanhoEmbalagem),
              motivo: `Uso em ${servico.nome}`,
              agendamentoId: agendamento.id,
              createdAt: concluidoEm,
            },
          });
        }

        // quase metade dos clientes avalia
        if (aleatorio() < 0.45) {
          const [nota, comentario] = sortear(COMENTARIOS);
          await prisma.avaliacao.create({
            data: { lojaId: loja.id, clienteId: cliente.id, agendamentoId: agendamento.id, nota, comentario, createdAt: concluidoEm },
          });
        }
      }
    }

    // deixa alguns produtos abaixo do mínimo pra aparecer o alerta
    for (const nome of ["Cera", "Pretinho", "Aromatizante"]) {
      const p = produto(nome);
      const alvo = Math.round(p.estoqueMinimo * 0.6);
      const ajuste = alvo - estoque.get(p.id)!;
      if (ajuste < 0) {
        estoque.set(p.id, alvo);
        await prisma.movimentoEstoque.create({
          data: { produtoId: p.id, tipo: "AJUSTE", quantidade: ajuste, motivo: "Contagem de inventário" },
        });
      }
    }
    for (const [id, qtd] of estoque) {
      await prisma.produto.update({ where: { id }, data: { estoqueAtual: Math.max(0, Math.round(qtd)) } });
    }

    // despesas dos últimos 2 meses (proporcionais ao movimento da loja)
    const mesAtual = hoje.slice(0, 7);
    const mesAnterior = somarDias(`${mesAtual}-01`, -1).slice(0, 7);
    const escala = base.movimento[1] / 9;
    for (const mes of [mesAnterior, mesAtual]) {
      await prisma.despesa.createMany({
        data: [
          { lojaId: loja.id, descricao: "Aluguel", categoria: "Aluguel", valor: reais(Math.round(3500 * escala)), data: `${mes}-05` },
          { lojaId: loja.id, descricao: "Conta de água", categoria: "Água e luz", valor: reais(inteiro(300, 650)), data: `${mes}-10` },
          { lojaId: loja.id, descricao: "Conta de luz", categoria: "Água e luz", valor: reais(inteiro(250, 520)), data: `${mes}-12` },
          { lojaId: loja.id, descricao: "Salários", categoria: "Salários", valor: reais(Math.round(4400 * escala)), data: `${mes}-05` },
          { lojaId: loja.id, descricao: "Anúncios", categoria: "Marketing", valor: reais(300), data: `${mes}-15` },
        ].filter((x) => x.data <= hoje),
      });
    }
  }

  // Loja recém-cadastrada, esperando aprovação da plataforma (status padrão: PENDENTE).
  // Já tem serviços: depois de aprovada em /plataforma, aparece no app na hora.
  console.log("Loja Nova Loja Estética (pendente)...");
  await prisma.loja.create({
    data: {
      slug: "nova-loja",
      nome: "Nova Loja Estética",
      descricao: "Acabamos de abrir no Embaré. Lavagem caprichada com hora marcada.",
      telefone: "13995550101",
      endereco: "Av. Bartolomeu de Gusmão, 120",
      bairro: "Embaré",
      cidade: "Santos",
      latitude: -23.9742,
      longitude: -46.3176,
      horarios: {
        create: [0, 1, 2, 3, 4, 5, 6].map((d) => ({
          diaSemana: d,
          aberto: d !== 0,
          abre: 8 * 60,
          fecha: d === 6 ? 14 * 60 : 18 * 60,
        })),
      },
      usuarios: {
        create: { nome: "Dono Nova Loja", email: "admin@novaloja.com", senhaHash: senhaDono, papel: "ADMIN" },
      },
      servicos: {
        create: (["basica", "premium"] as const).map((chave, ordem) => {
          const s = SERVICOS[chave];
          return {
            nome: s.nome,
            resumo: s.resumo,
            inclusos: s.inclusos.join("\n"),
            duracaoMin: s.duracao,
            destaque: s.destaque ?? false,
            ordem,
            precos: {
              create: Object.entries(s.precos).map(([tipo, valor]) => ({
                tipoVeiculo: tipo as TipoVeiculo,
                preco: reais(valor),
              })),
            },
          };
        }),
      },
    },
  });

  console.log(`Pronto! ${codigo} agendamentos em ${LOJAS.length} lojas ativas + 1 loja pendente.`);
  console.log("Plataforma: dono@autocare.com / admin123 (em /plataforma)");
  console.log("Loja pendente: admin@novaloja.com / admin123");
  console.log("Painel: admin@brilhopro.com / admin123");
  console.log("Outras lojas: admin@lavacar.com, admin@spadocarro.com, admin@garagemdetail.com (senha admin123)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
