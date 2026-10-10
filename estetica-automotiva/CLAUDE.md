@AGENTS.md

# Projeto

Marketplace de estéticas automotivas (AutoCare): app do cliente (PWA) em `src/app/(cliente)`, painel de cada loja em `src/app/admin` e painel do dono da plataforma em `src/app/plataforma`.

- Multi-loja: toda consulta do painel filtra pelo `lojaId` que vem de `exigirAdmin()` (`src/lib/dal.ts`). Busca por id com `findFirst({ where: { id, lojaId } })`.
- Plataforma: login separado (`AdminPlataforma`, cookie `sessao_plataforma`). Toda página e action de `/plataforma` chama `exigirPlataforma()`; as consultas de lá enxergam todas as lojas (`src/lib/plataforma.ts`).
- Situação da loja: `Loja.status` (`PENDENTE` | `ATIVA` | `SUSPENSA`) é da plataforma; `Loja.ativa` é o liga/desliga do dono. A loja só está no ar se `lojaPublicada()` (`status = ATIVA` e `ativa`). `getLojaCompleta` não filtra por status (o painel da loja pendente usa): quem mostra pro cliente ou agenda confere `lojaPublicada()`. As páginas `/loja/[slug]` usam `getLojaNoApp()` (`src/lib/dal.ts`), que cuida da prévia.
- Mudou `status` ou `ativa`? Chame `updateTag(TAG_LOJAS)` e `updateTag(tagLoja(id))`.
- Sessão de loja que deixou de valer (loja suspensa, usuário desativado) vai pra `/admin/bloqueado`, nunca pra `/admin/login`: o `proxy.ts` devolveria pra `/admin`, em loop.
- Next.js 16 com `cacheComponents: true`: dado de requisição (cookies, data atual, banco) fica dentro de `<Suspense>`; catálogo usa `"use cache"` + `cacheTag` (`src/lib/catalogo.ts`) e as actions chamam `updateTag(tagLoja(id))`.
- Prisma 7 + SQLite via `@prisma/adapter-better-sqlite3`. Client gerado em `src/generated/prisma`.
- Cliente do app: conta com celular + senha (bcrypt, mín. 8), sem serviço externo. Regras em `src/lib/conta.ts`, actions em `src/app/(cliente)/conta/actions.ts`. Use `clienteAtual()` / `exigirCliente(caminho)` (`src/lib/dal.ts`); nunca identifique o cliente por nome/celular vindo de formulário. O cookie `sessao_cliente` leva uma impressão da senha (trocar a senha derruba as outras sessões). Senha temporária (`senhaTemporaria`) obriga a passar por `/conta/nova-senha`.
- Login do cliente: mensagem sempre "Celular ou senha incorretos."; 5 erros seguidos por celular bloqueiam 15 min (tabela `TentativaLogin`, conta antes de conferir a senha). `voltar=` só com `voltarSeguro()`.
- `origem` (`APP` | `BALCAO`) em Agendamento e Veiculo: a conta do cliente mostra só `APP`; o que o painel da loja cria é `BALCAO`. Cancelar/avaliar pelo ticket só o dono logado de um agendamento `APP`.
- Testes de ponta a ponta: `npm run build && npm run test:e2e` (Playwright, pasta `e2e/`, banco `prisma/e2e.db`, cópia do real).
- Dinheiro em centavos (Int). Datas de agenda como `"YYYY-MM-DD"` e horários em minutos desde 00:00. Fuso: America/Sao_Paulo (`src/lib/format.ts`).
- Tema escuro com tokens em `src/app/globals.css` (fundo, superficie, menta, dourado...).
- Textos da interface em português do Brasil.
