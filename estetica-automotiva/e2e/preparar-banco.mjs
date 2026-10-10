// Antes dos testes: copia o banco atual pra prisma/e2e.db e cria um cliente "de balcão"
// (cadastrado pela loja, sem senha) com um veículo e um agendamento feitos no balcão.
import fs from "node:fs";
import Database from "better-sqlite3";

export const BALCAO = { telefone: "11900000001", nome: "Cliente do Balcão", modelo: "Fusca do Balcão", codigo: "BALCAO01" };

fs.copyFileSync("prisma/lavagem.db", "prisma/e2e.db");
fs.rmSync("prisma/e2e.db-journal", { force: true });

const db = new Database("prisma/e2e.db");
const agora = new Date().toISOString().replace("Z", "+00:00");
const loja = db.prepare("select id from Loja where status = 'ATIVA' and ativa = 1 order by id limit 1").get();
if (!loja) throw new Error("O banco não tem loja no ar pra testar");
const servico = db.prepare("select id, nome, duracaoMin from Servico where lojaId = ? and ativo = 1 order by ordem limit 1").get(loja.id);
const preco = db.prepare("select preco from PrecoServico where servicoId = ? and tipoVeiculo = 'CARRO'").get(servico.id);

const cliente = db
  .prepare("insert into Cliente (nome, telefone, createdAt) values (?, ?, ?)")
  .run(BALCAO.nome, BALCAO.telefone, agora).lastInsertRowid;
const veiculo = db
  .prepare("insert into Veiculo (clienteId, tipo, modelo, placa, cor, origem, createdAt) values (?, 'CARRO', ?, 'BAL1C00', '', 'BALCAO', ?)")
  .run(cliente, BALCAO.modelo, agora).lastInsertRowid;
const data = new Date(Date.now() + 5 * 864e5).toISOString().slice(0, 10);
const agendamento = db
  .prepare(
    `insert into Agendamento (codigo, lojaId, clienteId, veiculoId, data, inicio, fim, status, observacoes, origem, total, desconto, createdAt, updatedAt)
     values (?, ?, ?, ?, ?, 600, ?, 'CONFIRMADO', '', 'BALCAO', ?, 0, ?, ?)`,
  )
  .run(BALCAO.codigo, loja.id, cliente, veiculo, data, 600 + servico.duracaoMin, preco.preco, agora, agora).lastInsertRowid;
db.prepare("insert into AgendamentoItem (agendamentoId, servicoId, nomeServico, preco, duracaoMin) values (?, ?, ?, ?, ?)").run(
  agendamento,
  servico.id,
  servico.nome,
  preco.preco,
  servico.duracaoMin,
);
db.close();
console.log("prisma/e2e.db pronto (cópia do banco + cliente de balcão)");
