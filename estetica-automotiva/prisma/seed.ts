// Seed de DEMONSTRAÇÃO (4 lojas + 1 pendente, clientes e ~740 agendamentos).
// Rode com `npx prisma db seed`. ATENÇÃO: apaga tudo que estiver no banco antes!
// Só pro seu PC: se recusa a rodar com NODE_ENV=production ou num banco do Neon.
// Senhas: todos os usuários de demonstração usam DEMO_SENHA e o admin da plataforma
// vem de PLATAFORMA_ADMIN_* (nada de senha no código).
import "dotenv/config";
import bcrypt from "bcryptjs";
import { criarPrisma, ehNeon, lerAdminPlataforma, recusar } from "./banco";
import type {
  FormaPagamento,
  StatusAgendamento,
  TipoVeiculo,
} from "../src/generated/prisma/enums";
import { diaDaSemana, hojeISO, minutosParaHora, somarDias } from "../src/lib/format";
import { PRODUTOS, SERVICOS, reais } from "./catalogo-padrao";

if (process.env.NODE_ENV === "production") {
  recusar("O seed de demonstração não roda com NODE_ENV=production (ele apaga o banco inteiro).");
}
if (ehNeon()) {
  recusar("O seed de demonstração não roda num banco do Neon (ele apaga o banco inteiro). Use o db:seed:molinari.");
}
const DEMO_SENHA = process.env.DEMO_SENHA ?? "";
if (DEMO_SENHA.length < 8) recusar("Defina DEMO_SENHA no .env (mínimo 8 caracteres): é a senha dos usuários de demonstração.");
const { problemas, admin } = lerAdminPlataforma();
if (problemas.length) recusar(problemas.join("\n  "));

const prisma = criarPrisma();

// Gerador pseudoaleatório com semente fixa: o seed sempre gera os mesmos dados
let semente = 42;
function aleatorio() {
  semente = (semente * 16807) % 2147483647;
  return (semente - 1) / 2147483646;
}
const inteiro = (min: number, max: number) => Math.floor(aleatorio() * (max - min + 1)) + min;
const sortear = <T,>(lista: T[]): T => lista[Math.floor(aleatorio() * lista.length)];
const MULT: Record<TipoVeiculo, number> = { MOTO: 0.5, CARRO: 1, SUV: 1.3, CAMINHONETE: 1.5 };

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
  await prisma.tentativaLogin.deleteMany();
  await prisma.avaliacao.deleteMany();
  await prisma.movimentoEstoque.deleteMany();
  await prisma.agendamentoItem.deleteMany();
  await prisma.agendamento.deleteMany();
  await prisma.veiculo.deleteMany();
  await prisma.cliente.deleteMany();
  await prisma.loja.deleteMany(); // apaga em cascata serviços, produtos, usuários...

  const hoje = hojeISO();
  const senhaDono = await bcrypt.hash(DEMO_SENHA, 10);
  const senhaAdmin = await bcrypt.hash(admin.senha, 10);

  // dono da plataforma (login em /plataforma). upsert: mantém o mesmo id entre um seed
  // e outro, então quem já estava logado na plataforma continua logado
  console.log("Admin da plataforma...");
  await prisma.adminPlataforma.upsert({
    where: { email: admin.email },
    update: { nome: admin.nome, senhaHash: senhaAdmin },
    create: { nome: admin.nome, email: admin.email, senhaHash: senhaAdmin },
  });
  const senhaFuncionario = senhaDono;

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
  console.log(`Plataforma (/plataforma): ${admin.email} (senha em PLATAFORMA_ADMIN_SENHA)`);
  console.log("Painel (/admin): admin@brilhopro.com, lucas@brilhopro.com (funcionário), admin@lavacar.com,");
  console.log("  admin@spadocarro.com, admin@garagemdetail.com e admin@novaloja.com (pendente). Senha: DEMO_SENHA");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
