// ZERA o banco do seu PC e roda o db:seed:molinari: `npm run db:reset:local`
//
// Só pra desenvolvimento. Se recusa a rodar com NODE_ENV=production ou num banco do Neon,
// e pede confirmação no terminal antes de apagar.
// Os ids NÃO são zerados (as sequências continuam): um cookie antigo guarda um id e,
// se a numeração recomeçasse, poderia abrir a conta de outra pessoa.
import { execSync } from "node:child_process";
import { createInterface } from "node:readline/promises";
import { criarPrisma, ehNeon, recusar, urlDoBanco } from "./banco";

if (process.env.NODE_ENV === "production") recusar("db:reset:local não roda com NODE_ENV=production.");
if (ehNeon()) recusar("db:reset:local não roda num banco do Neon (neon.tech na URL). Em produção use só o db:seed:molinari.");

async function main() {
  // mostra o banco sem a senha
  const destino = urlDoBanco().replace(/\/\/([^:@/]+):[^@/]*@/, "//$1:***@");
  console.log(`\nIsso APAGA TODOS OS DADOS de: ${destino}`);
  console.log("(lojas, clientes, agendamentos, estoque, acessos...) e depois roda o db:seed:molinari.\n");

  const terminal = createInterface({ input: process.stdin, output: process.stdout });
  const resposta = await terminal.question('Digite APAGAR pra confirmar: ');
  terminal.close();
  if (resposta.trim() !== "APAGAR") recusar("Cancelado. Nada foi apagado.");

  const prisma = criarPrisma();
  try {
    await prisma.$transaction(async (tx) => {
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
    });
    console.log("Banco zerado.\n");
  } finally {
    await prisma.$disconnect();
  }

  execSync("npx tsx prisma/seed-molinari.ts", { stdio: "inherit" });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
