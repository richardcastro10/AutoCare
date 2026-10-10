// Implantação da loja Molinari: rode com `npm run db:seed:molinari`
// ATENÇÃO: apaga TODOS os dados do banco (lojas, clientes, agendamentos, acessos...)
// e deixa só o admin da plataforma e a Molinari pronta pra usar.
// Pra voltar pro demo: `npx prisma db seed`.
import "dotenv/config";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import type { TipoVeiculo } from "../src/generated/prisma/enums";
import { somenteDigitos } from "../src/lib/format";
import { PRODUTOS, SERVICOS, acharProduto, reais } from "./catalogo-padrao";

// ---------------------------------------------------------------------------
// DADOS PÚBLICOS DA LOJA (aparecem no app pra qualquer cliente; pode editar aqui)
// Dados do dono (nome, e-mail, senha) NÃO ficam aqui: vêm do .env, porque o repositório é público.
// ---------------------------------------------------------------------------
const LOJA = {
  nome: "Molinari",
  slug: "molinari", // endereço no app: /loja/molinari (não mude depois de divulgar)
  descricao: "Estética automotiva: lavagem, polimento, vitrificação e higienização.",
  whatsapp: "13974238863", // DDD + número, só dígitos (sem o 55)
  endereco: "R. Torquato Dias, 983", // rua e número
  bairro: "Nova Cintra",
  cidade: "Santos",
  uf: "SP",
  // latitude/longitude ficam em branco: o dono preenche em Configurações, na loja
  vagasSimultaneas: 2,
  // dia da semana (0 = domingo ... 6 = sábado) -> horário; dia fora daqui fica fechado
  horario: {
    1: { abre: "08:00", fecha: "18:00" },
    2: { abre: "08:00", fecha: "18:00" },
    3: { abre: "08:00", fecha: "18:00" },
    4: { abre: "08:00", fecha: "18:00" },
    5: { abre: "08:00", fecha: "18:00" },
    6: { abre: "08:00", fecha: "18:00" },
  } as Partial<Record<number, { abre: string; fecha: string }>>,
};

// Admin da plataforma (/plataforma): o mesmo do demo
const ADMIN_PLATAFORMA = { nome: "Dono AutoCare", email: "dono@autocare.com", senha: "admin123" };

// ---------------------------------------------------------------------------

const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL ?? "file:./prisma/lavagem.db" }),
});

const naoPreenchido = (v: string) => !v.trim() || /preencher/i.test(v);
const minutos = (hora: string) => {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + m;
};

// Confere tudo ANTES de apagar qualquer coisa: com dado faltando, o banco fica como está.
function validar() {
  const erros: string[] = [];

  const whatsapp = somenteDigitos(LOJA.whatsapp);
  if (whatsapp.length !== 10 && whatsapp.length !== 11) erros.push("LOJA.whatsapp: use DDD + número (10 ou 11 dígitos)");
  if (naoPreenchido(LOJA.endereco)) erros.push("LOJA.endereco: preencha rua e número");
  if (naoPreenchido(LOJA.bairro)) erros.push("LOJA.bairro: preencha o bairro");
  for (const [dia, h] of Object.entries(LOJA.horario)) {
    if (!h || !/^\d{2}:\d{2}$/.test(h.abre) || !/^\d{2}:\d{2}$/.test(h.fecha) || minutos(h.fecha) <= minutos(h.abre)) {
      erros.push(`LOJA.horario[${dia}]: use "HH:MM" e feche depois de abrir`);
    }
  }

  const dono = z
    .object({
      MOLINARI_DONO_NOME: z.string().trim().min(2, "informe o nome do dono"),
      MOLINARI_DONO_EMAIL: z.email("e-mail inválido").transform((e) => e.toLowerCase()),
      MOLINARI_DONO_SENHA: z.string().min(6, "a senha precisa de pelo menos 6 caracteres"),
    })
    .safeParse({
      MOLINARI_DONO_NOME: process.env.MOLINARI_DONO_NOME ?? "",
      MOLINARI_DONO_EMAIL: process.env.MOLINARI_DONO_EMAIL ?? "",
      MOLINARI_DONO_SENHA: process.env.MOLINARI_DONO_SENHA ?? "",
    });
  if (!dono.success) {
    for (const i of dono.error.issues) erros.push(`.env ${String(i.path[0])}: ${i.message}`);
  } else {
    // os valores fictícios do .env.example não servem
    const d = dono.data;
    if (d.MOLINARI_DONO_EMAIL.endsWith("@exemplo.com")) erros.push(".env MOLINARI_DONO_EMAIL: ainda é o valor de exemplo");
    if (/troque/i.test(d.MOLINARI_DONO_SENHA)) erros.push(".env MOLINARI_DONO_SENHA: ainda é o valor de exemplo");
    if (/exemplo/i.test(d.MOLINARI_DONO_NOME)) erros.push(".env MOLINARI_DONO_NOME: ainda é o valor de exemplo");
  }

  if (erros.length || !dono.success) {
    console.error("Nada foi apagado. Corrija antes de rodar:\n- " + erros.join("\n- "));
    process.exit(1);
  }
  return {
    whatsapp,
    dono: { nome: dono.data.MOLINARI_DONO_NOME, email: dono.data.MOLINARI_DONO_EMAIL, senha: dono.data.MOLINARI_DONO_SENHA },
  };
}

async function main() {
  const { whatsapp, dono } = validar();
  const [senhaDono, senhaAdmin] = await Promise.all([
    bcrypt.hash(dono.senha, 10),
    bcrypt.hash(ADMIN_PLATAFORMA.senha, 10),
  ]);
  const agora = new Date();

  // Tudo numa transação: se der erro no meio, o banco volta como estava.
  // Os ids NÃO são zerados (as tabelas usam AUTOINCREMENT): assim um cookie antigo do demo,
  // que guarda um id, nunca aponta pra um registro novo.
  await prisma.$transaction(
    async (tx) => {
      console.log("Apagando todos os dados...");
      // filhos antes dos pais (chaves estrangeiras)
      await tx.avaliacao.deleteMany();
      await tx.movimentoEstoque.deleteMany();
      await tx.agendamentoItem.deleteMany();
      await tx.agendamento.deleteMany();
      await tx.despesa.deleteMany();
      await tx.bloqueio.deleteMany();
      await tx.horarioFuncionamento.deleteMany();
      await tx.servicoInsumo.deleteMany();
      await tx.precoServico.deleteMany();
      await tx.servico.deleteMany();
      await tx.produto.deleteMany();
      await tx.usuario.deleteMany();
      await tx.veiculo.deleteMany();
      await tx.cliente.deleteMany();
      await tx.loja.deleteMany();
      await tx.tentativaLogin.deleteMany();
      await tx.adminPlataforma.deleteMany();

      console.log("Admin da plataforma...");
      await tx.adminPlataforma.create({
        data: { nome: ADMIN_PLATAFORMA.nome, email: ADMIN_PLATAFORMA.email, senhaHash: senhaAdmin },
      });

      console.log(`Loja ${LOJA.nome}...`);
      const loja = await tx.loja.create({
        data: {
          slug: LOJA.slug,
          nome: LOJA.nome,
          descricao: LOJA.descricao,
          telefone: whatsapp,
          endereco: LOJA.endereco.trim(),
          bairro: LOJA.bairro.trim(),
          cidade: LOJA.cidade,
          uf: LOJA.uf,
          vagasSimultaneas: LOJA.vagasSimultaneas,
          // loja real: já entra aprovada pela plataforma e ligada
          status: "ATIVA",
          ativa: true,
          statusAlteradoEm: agora,
          horarios: {
            create: [0, 1, 2, 3, 4, 5, 6].map((dia) => {
              const h = LOJA.horario[dia];
              return h
                ? { diaSemana: dia, aberto: true, abre: minutos(h.abre), fecha: minutos(h.fecha) }
                : { diaSemana: dia, aberto: false, abre: 8 * 60, fecha: 18 * 60 };
            }),
          },
          usuarios: {
            create: { nome: dono.nome, email: dono.email, senhaHash: senhaDono, papel: "ADMIN" },
          },
        },
      });

      console.log("Produtos e compra inicial de estoque...");
      const produtos: { id: number; nome: string }[] = [];
      for (const p of PRODUTOS) {
        // mesma quantidade do demo: 16x o mínimo (aromatizante: 300 un).
        // São números de partida: o dono ajusta pela contagem real em Estoque.
        const embalagens = p.unidade === "un" ? 300 : Math.ceil((p.minimo * 16) / p.tamanho);
        const quantidade = embalagens * p.tamanho;
        const precoEmbalagem = reais(p.preco);
        produtos.push(
          await tx.produto.create({
            data: {
              lojaId: loja.id,
              nome: p.nome,
              unidade: p.unidade,
              tamanhoEmbalagem: p.tamanho,
              precoEmbalagem,
              estoqueMinimo: p.minimo,
              estoqueAtual: quantidade,
              movimentos: {
                create: {
                  tipo: "ENTRADA",
                  quantidade,
                  custoTotal: embalagens * precoEmbalagem,
                  motivo: `Compra inicial (${embalagens} embalagens)`,
                  createdAt: agora,
                },
              },
            },
          }),
        );
      }

      console.log("Serviços, preços e ficha técnica...");
      for (const [ordem, s] of Object.values(SERVICOS).entries()) {
        await tx.servico.create({
          data: {
            lojaId: loja.id,
            nome: s.nome,
            resumo: s.resumo,
            inclusos: s.inclusos.join("\n"),
            duracaoMin: s.duracao,
            destaque: s.destaque ?? false,
            ordem,
            // preço cheio da tabela padrão, sem ajuste
            precos: {
              create: Object.entries(s.precos).map(([tipo, valor]) => ({
                tipoVeiculo: tipo as TipoVeiculo,
                preco: reais(valor),
              })),
            },
            insumos: {
              create: s.insumos.map(([nome, quantidade]) => ({ produtoId: acharProduto(produtos, nome).id, quantidade })),
            },
          },
        });
      }
    },
    { timeout: 60_000 },
  );

  // confere o resultado lendo de volta do banco
  const contagem = {
    lojas: await prisma.loja.count(),
    servicos: await prisma.servico.count(),
    precos: await prisma.precoServico.count(),
    fichaTecnica: await prisma.servicoInsumo.count(),
    produtos: await prisma.produto.count(),
    entradasDeEstoque: await prisma.movimentoEstoque.count({ where: { tipo: "ENTRADA" } }),
    usuariosDoPainel: await prisma.usuario.count(),
    adminsDaPlataforma: await prisma.adminPlataforma.count(),
    clientes: await prisma.cliente.count(),
    agendamentos: await prisma.agendamento.count(),
    avaliacoes: await prisma.avaliacao.count(),
    despesas: await prisma.despesa.count(),
  };
  console.table(contagem);
  console.log(`\nPronto! ${LOJA.nome} no ar em /loja/${LOJA.slug}`);
  console.log(`Painel da loja (/admin): ${dono.email} (senha do .env)`);
  console.log(`Plataforma (/plataforma): ${ADMIN_PLATAFORMA.email} / ${ADMIN_PLATAFORMA.senha}`);
  console.log("Reinicie o `npm run dev`: a lista de lojas fica em cache.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
