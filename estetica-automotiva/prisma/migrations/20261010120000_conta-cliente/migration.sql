-- DropIndex
DROP INDEX "CodigoVerificacao_telefone_idx";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "CodigoVerificacao";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "TentativaLogin" (
    "telefone" TEXT NOT NULL PRIMARY KEY,
    "falhas" INTEGER NOT NULL DEFAULT 0,
    "ultimaFalha" DATETIME NOT NULL,
    "bloqueadoAte" DATETIME
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Agendamento" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "codigo" TEXT NOT NULL,
    "lojaId" INTEGER NOT NULL,
    "clienteId" INTEGER NOT NULL,
    "veiculoId" INTEGER NOT NULL,
    "data" TEXT NOT NULL,
    "inicio" INTEGER NOT NULL,
    "fim" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "observacoes" TEXT NOT NULL DEFAULT '',
    "origem" TEXT NOT NULL DEFAULT 'BALCAO',
    "total" INTEGER NOT NULL,
    "desconto" INTEGER NOT NULL DEFAULT 0,
    "valorPago" INTEGER,
    "formaPagamento" TEXT,
    "concluidoEm" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Agendamento_lojaId_fkey" FOREIGN KEY ("lojaId") REFERENCES "Loja" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Agendamento_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Agendamento_veiculoId_fkey" FOREIGN KEY ("veiculoId") REFERENCES "Veiculo" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Agendamento" ("clienteId", "codigo", "concluidoEm", "createdAt", "data", "desconto", "fim", "formaPagamento", "id", "inicio", "lojaId", "observacoes", "status", "total", "updatedAt", "valorPago", "veiculoId") SELECT "clienteId", "codigo", "concluidoEm", "createdAt", "data", "desconto", "fim", "formaPagamento", "id", "inicio", "lojaId", "observacoes", "status", "total", "updatedAt", "valorPago", "veiculoId" FROM "Agendamento";
DROP TABLE "Agendamento";
ALTER TABLE "new_Agendamento" RENAME TO "Agendamento";
CREATE UNIQUE INDEX "Agendamento_codigo_key" ON "Agendamento"("codigo");
CREATE INDEX "Agendamento_lojaId_data_idx" ON "Agendamento"("lojaId", "data");
CREATE INDEX "Agendamento_clienteId_idx" ON "Agendamento"("clienteId");
CREATE TABLE "new_Cliente" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nome" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "senhaHash" TEXT,
    "senhaTemporaria" BOOLEAN NOT NULL DEFAULT false,
    "contaCriadaEm" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Cliente" ("createdAt", "id", "nome", "telefone") SELECT "createdAt", "id", "nome", "telefone" FROM "Cliente";
DROP TABLE "Cliente";
ALTER TABLE "new_Cliente" RENAME TO "Cliente";
CREATE UNIQUE INDEX "Cliente_telefone_key" ON "Cliente"("telefone");
CREATE TABLE "new_Veiculo" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "clienteId" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "modelo" TEXT NOT NULL,
    "placa" TEXT NOT NULL DEFAULT '',
    "cor" TEXT NOT NULL DEFAULT '',
    "origem" TEXT NOT NULL DEFAULT 'BALCAO',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Veiculo_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Veiculo" ("clienteId", "cor", "createdAt", "id", "modelo", "placa", "tipo") SELECT "clienteId", "cor", "createdAt", "id", "modelo", "placa", "tipo" FROM "Veiculo";
DROP TABLE "Veiculo";
ALTER TABLE "new_Veiculo" RENAME TO "Veiculo";
CREATE INDEX "Veiculo_clienteId_idx" ON "Veiculo"("clienteId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
