// Seed de PRODUÇÃO da loja Molinari: `npm run db:seed:molinari`
//
// Seguro pra rodar no Neon quantas vezes precisar: NUNCA apaga nada e é idempotente.
// - loja: upsert pelo slug (na primeira vez cria; depois não sobrescreve o que o dono
//   editou no painel, só completa a logo se ela ainda estiver vazia);
// - horários: só os dias que ainda não existem;
// - serviços padrão (catalogo-padrao.ts) com preço por tipo de veículo, SEM ficha técnica:
//   só se a loja ainda não tiver nenhum serviço;
// - dono da loja (MOLINARI_DONO_*) e admin da plataforma (PLATAFORMA_ADMIN_*):
//   criados só se o e-mail ainda não existir (nunca troca a senha de quem já existe).
// Não cria produtos, estoque, clientes, veículos, agendamentos, avaliações nem despesas.
//
// Pra começar do zero NO SEU PC: `npm run db:reset:local` (apaga tudo e roda este script).
import fs from "node:fs";
import path from "node:path";
import bcrypt from "bcryptjs";
import { z } from "zod";
import type { TipoVeiculo } from "../src/generated/prisma/enums";
import { somenteDigitos } from "../src/lib/format";
import { SERVICOS, reais } from "./catalogo-padrao";
import { criarPrisma, lerAdminPlataforma, recusar } from "./banco";

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
  // logo fixa (veja "Logo de cada loja" no README): arquivo em public/lojas/<slug>-logo.webp
  logoUrl: "/lojas/molinari-logo.webp",
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
// ---------------------------------------------------------------------------

const naoPreenchido = (v: string) => !v.trim() || /preencher/i.test(v);
const minutos = (hora: string) => {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + m;
};

// Confere tudo ANTES de gravar qualquer coisa
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
      MOLINARI_DONO_SENHA: z.string().min(6, "a senha precisa de pelo menos 6 caracteres (regra do painel)"),
    })
    .safeParse({
      MOLINARI_DONO_NOME: process.env.MOLINARI_DONO_NOME ?? "",
      MOLINARI_DONO_EMAIL: process.env.MOLINARI_DONO_EMAIL ?? "",
      MOLINARI_DONO_SENHA: process.env.MOLINARI_DONO_SENHA ?? "",
    });
  if (!dono.success) {
    for (const i of dono.error.issues) erros.push(`${String(i.path[0])}: ${i.message}`);
  } else {
    // os valores fictícios do .env.example não servem
    const d = dono.data;
    if (d.MOLINARI_DONO_EMAIL.endsWith("@exemplo.com")) erros.push("MOLINARI_DONO_EMAIL: ainda é o valor de exemplo");
    if (/troque/i.test(d.MOLINARI_DONO_SENHA)) erros.push("MOLINARI_DONO_SENHA: ainda é o valor de exemplo");
    if (/exemplo/i.test(d.MOLINARI_DONO_NOME)) erros.push("MOLINARI_DONO_NOME: ainda é o valor de exemplo");
  }

  const { problemas, admin } = lerAdminPlataforma();
  erros.push(...problemas);

  if (erros.length || !dono.success) recusar("Nada foi gravado. Corrija antes de rodar:\n  - " + erros.join("\n  - "));
  return {
    whatsapp,
    admin,
    dono: { nome: dono.data.MOLINARI_DONO_NOME, email: dono.data.MOLINARI_DONO_EMAIL, senha: dono.data.MOLINARI_DONO_SENHA },
  };
}

async function main() {
  const { whatsapp, dono, admin } = validar();
  const prisma = criarPrisma();
  const resumo: string[] = [];

  try {
    // logo só entra se o arquivo existir (senão a página mostraria uma imagem quebrada)
    const arquivoLogo = path.join("public", LOJA.logoUrl);
    const temLogo = fs.existsSync(arquivoLogo);
    if (!temLogo) {
      console.warn(`⚠ ${arquivoLogo} não existe: a loja fica com a logo padrão (o nome em dourado).`);
      console.warn("  Gere a logo com `npm run logo:loja -- molinari <arquivo.png>` e rode este script de novo.");
    }

    await prisma.$transaction(
      async (tx) => {
        // ---- loja ----
        const existente = await tx.loja.findUnique({ where: { slug: LOJA.slug } });
        const loja = await tx.loja.upsert({
          where: { slug: LOJA.slug },
          create: {
            slug: LOJA.slug,
            nome: LOJA.nome,
            descricao: LOJA.descricao,
            telefone: whatsapp,
            endereco: LOJA.endereco.trim(),
            bairro: LOJA.bairro.trim(),
            cidade: LOJA.cidade,
            uf: LOJA.uf,
            vagasSimultaneas: LOJA.vagasSimultaneas,
            logoUrl: temLogo ? LOJA.logoUrl : "",
            // loja real: já entra aprovada pela plataforma e ligada
            status: "ATIVA",
            ativa: true,
            statusAlteradoEm: new Date(),
          },
          // já existe: não mexe no que o dono editou no painel nem no status que a plataforma
          // definiu (ex.: suspensa). Só completa a logo, se ela ainda estiver vazia.
          update: temLogo && !existente?.logoUrl ? { logoUrl: LOJA.logoUrl } : {},
        });
        resumo.push(existente ? `Loja ${loja.nome}: já existia (dados mantidos)` : `Loja ${loja.nome}: criada`);

        // ---- horários (só os dias que faltam) ----
        const horarios = await tx.horarioFuncionamento.createMany({
          data: [0, 1, 2, 3, 4, 5, 6].map((dia) => {
            const h = LOJA.horario[dia];
            return h
              ? { lojaId: loja.id, diaSemana: dia, aberto: true, abre: minutos(h.abre), fecha: minutos(h.fecha) }
              : { lojaId: loja.id, diaSemana: dia, aberto: false, abre: 8 * 60, fecha: 18 * 60 };
          }),
          skipDuplicates: true, // @@unique([lojaId, diaSemana])
        });
        resumo.push(`Horários: ${horarios.count} dias criados (${7 - horarios.count} já existiam)`);

        // ---- serviços padrão: só se a loja ainda não tem nenhum ----
        const servicosExistentes = await tx.servico.count({ where: { lojaId: loja.id } });
        if (servicosExistentes === 0) {
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
                // preço cheio da tabela padrão; sem ficha técnica (o dono monta o estoque depois)
                precos: {
                  create: Object.entries(s.precos).map(([tipo, valor]) => ({
                    tipoVeiculo: tipo as TipoVeiculo,
                    preco: reais(valor),
                  })),
                },
              },
            });
          }
          resumo.push(`Serviços: ${Object.keys(SERVICOS).length} criados`);
        } else {
          resumo.push(`Serviços: a loja já tem ${servicosExistentes}, nenhum criado`);
        }

        // ---- dono da loja: só se o e-mail ainda não existe ----
        const usuario = await tx.usuario.findUnique({ where: { email: dono.email } });
        if (!usuario) {
          await tx.usuario.create({
            data: {
              lojaId: loja.id,
              nome: dono.nome,
              email: dono.email,
              senhaHash: await bcrypt.hash(dono.senha, 10),
              papel: "ADMIN",
            },
          });
          resumo.push(`Dono ${dono.email}: criado`);
        } else if (usuario.lojaId !== loja.id) {
          resumo.push(`⚠ Dono ${dono.email}: o e-mail já é usado em OUTRA loja; nada foi alterado`);
        } else {
          resumo.push(`Dono ${dono.email}: já existia (senha mantida)`);
        }

        // ---- admin da plataforma: só se o e-mail ainda não existe ----
        const jaTemAdmin = await tx.adminPlataforma.findUnique({ where: { email: admin.email } });
        if (!jaTemAdmin) {
          await tx.adminPlataforma.create({
            data: { nome: admin.nome, email: admin.email, senhaHash: await bcrypt.hash(admin.senha, 10) },
          });
          resumo.push(`Admin da plataforma ${admin.email}: criado`);
        } else {
          resumo.push(`Admin da plataforma ${admin.email}: já existia (senha mantida)`);
        }
      },
      { timeout: 60_000 },
    );
  } finally {
    await prisma.$disconnect();
  }

  console.log("\n" + resumo.map((r) => `• ${r}`).join("\n"));
  console.log(`\nPronto! ${LOJA.nome} em /loja/${LOJA.slug}`);
  console.log("Painel da loja: /admin · Plataforma: /plataforma (senhas: as do .env / variáveis de ambiente)");
  console.log("Com o `npm run dev` aberto? Reinicie: a lista de lojas fica em cache.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
