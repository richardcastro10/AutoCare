-- CreateTable
CREATE TABLE "Loja" (
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
    "vagasSimultaneas" INTEGER NOT NULL DEFAULT 2,
    "intervaloSlotMin" INTEGER NOT NULL DEFAULT 30,
    "antecedenciaMinHoras" INTEGER NOT NULL DEFAULT 1,
    "diasAntecedenciaMax" INTEGER NOT NULL DEFAULT 30,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Usuario" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "lojaId" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "papel" TEXT NOT NULL DEFAULT 'FUNCIONARIO',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Usuario_lojaId_fkey" FOREIGN KEY ("lojaId") REFERENCES "Loja" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "HorarioFuncionamento" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "lojaId" INTEGER NOT NULL,
    "diaSemana" INTEGER NOT NULL,
    "aberto" BOOLEAN NOT NULL DEFAULT true,
    "abre" INTEGER NOT NULL DEFAULT 480,
    "fecha" INTEGER NOT NULL DEFAULT 1080,
    CONSTRAINT "HorarioFuncionamento_lojaId_fkey" FOREIGN KEY ("lojaId") REFERENCES "Loja" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Bloqueio" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "lojaId" INTEGER NOT NULL,
    "data" TEXT NOT NULL,
    "motivo" TEXT NOT NULL,
    CONSTRAINT "Bloqueio_lojaId_fkey" FOREIGN KEY ("lojaId") REFERENCES "Loja" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Servico" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "lojaId" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "resumo" TEXT NOT NULL DEFAULT '',
    "inclusos" TEXT NOT NULL DEFAULT '',
    "duracaoMin" INTEGER NOT NULL,
    "imagemUrl" TEXT NOT NULL DEFAULT '',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "destaque" BOOLEAN NOT NULL DEFAULT false,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Servico_lojaId_fkey" FOREIGN KEY ("lojaId") REFERENCES "Loja" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PrecoServico" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "servicoId" INTEGER NOT NULL,
    "tipoVeiculo" TEXT NOT NULL,
    "preco" INTEGER NOT NULL,
    CONSTRAINT "PrecoServico_servicoId_fkey" FOREIGN KEY ("servicoId") REFERENCES "Servico" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Produto" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "lojaId" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "unidade" TEXT NOT NULL,
    "estoqueAtual" REAL NOT NULL DEFAULT 0,
    "estoqueMinimo" REAL NOT NULL DEFAULT 0,
    "precoEmbalagem" INTEGER NOT NULL DEFAULT 0,
    "tamanhoEmbalagem" REAL NOT NULL DEFAULT 1,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Produto_lojaId_fkey" FOREIGN KEY ("lojaId") REFERENCES "Loja" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ServicoInsumo" (
    "servicoId" INTEGER NOT NULL,
    "produtoId" INTEGER NOT NULL,
    "quantidade" REAL NOT NULL,

    PRIMARY KEY ("servicoId", "produtoId"),
    CONSTRAINT "ServicoInsumo_servicoId_fkey" FOREIGN KEY ("servicoId") REFERENCES "Servico" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ServicoInsumo_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MovimentoEstoque" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "produtoId" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "quantidade" REAL NOT NULL,
    "custoTotal" INTEGER NOT NULL DEFAULT 0,
    "motivo" TEXT NOT NULL DEFAULT '',
    "agendamentoId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MovimentoEstoque_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MovimentoEstoque_agendamentoId_fkey" FOREIGN KEY ("agendamentoId") REFERENCES "Agendamento" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Cliente" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nome" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Veiculo" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "clienteId" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "modelo" TEXT NOT NULL,
    "placa" TEXT NOT NULL DEFAULT '',
    "cor" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Veiculo_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Agendamento" (
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

-- CreateTable
CREATE TABLE "AgendamentoItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "agendamentoId" INTEGER NOT NULL,
    "servicoId" INTEGER NOT NULL,
    "nomeServico" TEXT NOT NULL,
    "preco" INTEGER NOT NULL,
    "duracaoMin" INTEGER NOT NULL,
    CONSTRAINT "AgendamentoItem_agendamentoId_fkey" FOREIGN KEY ("agendamentoId") REFERENCES "Agendamento" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AgendamentoItem_servicoId_fkey" FOREIGN KEY ("servicoId") REFERENCES "Servico" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Avaliacao" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "lojaId" INTEGER NOT NULL,
    "clienteId" INTEGER NOT NULL,
    "agendamentoId" INTEGER NOT NULL,
    "nota" INTEGER NOT NULL,
    "comentario" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Avaliacao_lojaId_fkey" FOREIGN KEY ("lojaId") REFERENCES "Loja" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Avaliacao_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Avaliacao_agendamentoId_fkey" FOREIGN KEY ("agendamentoId") REFERENCES "Agendamento" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Despesa" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "lojaId" INTEGER NOT NULL,
    "descricao" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "valor" INTEGER NOT NULL,
    "data" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Despesa_lojaId_fkey" FOREIGN KEY ("lojaId") REFERENCES "Loja" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Loja_slug_key" ON "Loja"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE INDEX "Usuario_lojaId_idx" ON "Usuario"("lojaId");

-- CreateIndex
CREATE UNIQUE INDEX "HorarioFuncionamento_lojaId_diaSemana_key" ON "HorarioFuncionamento"("lojaId", "diaSemana");

-- CreateIndex
CREATE UNIQUE INDEX "Bloqueio_lojaId_data_key" ON "Bloqueio"("lojaId", "data");

-- CreateIndex
CREATE INDEX "Servico_lojaId_idx" ON "Servico"("lojaId");

-- CreateIndex
CREATE UNIQUE INDEX "PrecoServico_servicoId_tipoVeiculo_key" ON "PrecoServico"("servicoId", "tipoVeiculo");

-- CreateIndex
CREATE INDEX "Produto_lojaId_idx" ON "Produto"("lojaId");

-- CreateIndex
CREATE INDEX "MovimentoEstoque_produtoId_idx" ON "MovimentoEstoque"("produtoId");

-- CreateIndex
CREATE INDEX "MovimentoEstoque_agendamentoId_idx" ON "MovimentoEstoque"("agendamentoId");

-- CreateIndex
CREATE UNIQUE INDEX "Cliente_telefone_key" ON "Cliente"("telefone");

-- CreateIndex
CREATE INDEX "Veiculo_clienteId_idx" ON "Veiculo"("clienteId");

-- CreateIndex
CREATE UNIQUE INDEX "Agendamento_codigo_key" ON "Agendamento"("codigo");

-- CreateIndex
CREATE INDEX "Agendamento_lojaId_data_idx" ON "Agendamento"("lojaId", "data");

-- CreateIndex
CREATE INDEX "Agendamento_clienteId_idx" ON "Agendamento"("clienteId");

-- CreateIndex
CREATE INDEX "AgendamentoItem_agendamentoId_idx" ON "AgendamentoItem"("agendamentoId");

-- CreateIndex
CREATE UNIQUE INDEX "Avaliacao_agendamentoId_key" ON "Avaliacao"("agendamentoId");

-- CreateIndex
CREATE INDEX "Avaliacao_lojaId_idx" ON "Avaliacao"("lojaId");

-- CreateIndex
CREATE INDEX "Despesa_lojaId_data_idx" ON "Despesa"("lojaId", "data");
