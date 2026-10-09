-- CreateTable
CREATE TABLE "CodigoVerificacao" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "telefone" TEXT NOT NULL,
    "codigoHash" TEXT NOT NULL,
    "expiraEm" DATETIME NOT NULL,
    "tentativas" INTEGER NOT NULL DEFAULT 0,
    "usadoEm" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "CodigoVerificacao_telefone_idx" ON "CodigoVerificacao"("telefone");
