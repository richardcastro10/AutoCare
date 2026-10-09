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
- Cliente do app não tem senha: o `COOKIE_CLIENTE` só é gravado pela action `verificarCodigo` (`src/app/(cliente)/meus-agendamentos/actions.ts`), depois do código de 6 dígitos do WhatsApp (`src/lib/verificacao.ts`). Nunca crie/atualize cliente nem grave esse cookie a partir de telefone vindo do formulário; use `clienteAtualId()`. Nunca devolva pro navegador se um telefone já tem cadastro. O link `/agendamento/CODIGO` continua sem login.
- `src/lib/whatsapp.ts` ainda não envia de verdade: em dev mostra o código no terminal; em produção falha, salvo `WHATSAPP_CODIGO_NO_TERMINAL=1` (só teste local).
- Dinheiro em centavos (Int). Datas de agenda como `"YYYY-MM-DD"` e horários em minutos desde 00:00. Fuso: America/Sao_Paulo (`src/lib/format.ts`).
- Tema escuro com tokens em `src/app/globals.css` (fundo, superficie, menta, dourado...).
- Textos da interface em português do Brasil.
