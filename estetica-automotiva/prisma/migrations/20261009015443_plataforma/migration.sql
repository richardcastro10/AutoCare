-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN "ultimoAcesso" DATETIME;

-- CreateTable
CREATE TABLE "AdminPlataforma" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Loja" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "slug" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT NOT NULL DEFAULT '',
    "telefone" TEXT NOT NULL DEFAULT '',
    "endereco" TEXT NOT NULL DEFAULT '',
    "bairro" TEXT NOT NULL DEFAULT '',
    "cidade" TEXT NOT NULL DEFAULT '',
    "uf" TEXT NOT NULL DEFAULT 'SP',
    "latitude" REAL,
    "longitude" REAL,
    "capaUrl" TEXT NOT NULL DEFAULT '',
    "logoUrl" TEXT NOT NULL DEFAULT '',
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "motivoStatus" TEXT NOT NULL DEFAULT '',
    "statusAlteradoEm" DATETIME,
    "vagasSimultaneas" INTEGER NOT NULL DEFAULT 2,
    "intervaloSlotMin" INTEGER NOT NULL DEFAULT 30,
    "antecedenciaMinHoras" INTEGER NOT NULL DEFAULT 1,
    "diasAntecedenciaMax" INTEGER NOT NULL DEFAULT 30,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Loja" ("antecedenciaMinHoras", "ativa", "bairro", "capaUrl", "cidade", "createdAt", "descricao", "diasAntecedenciaMax", "endereco", "id", "intervaloSlotMin", "latitude", "logoUrl", "longitude", "nome", "slug", "telefone", "uf", "vagasSimultaneas") SELECT "antecedenciaMinHoras", "ativa", "bairro", "capaUrl", "cidade", "createdAt", "descricao", "diasAntecedenciaMax", "endereco", "id", "intervaloSlotMin", "latitude", "logoUrl", "longitude", "nome", "slug", "telefone", "uf", "vagasSimultaneas" FROM "Loja";
DROP TABLE "Loja";
ALTER TABLE "new_Loja" RENAME TO "Loja";
-- Ajuste manual: as lojas que já existiam continuam no ar (ATIVA).
-- Só as cadastradas daqui pra frente nascem PENDENTE (o DEFAULT da coluna).
UPDATE "Loja" SET "status" = 'ATIVA', "statusAlteradoEm" = CURRENT_TIMESTAMP;
CREATE UNIQUE INDEX "Loja_slug_key" ON "Loja"("slug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "AdminPlataforma_email_key" ON "AdminPlataforma"("email");
