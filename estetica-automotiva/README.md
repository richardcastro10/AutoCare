# AutoCare: marketplace de estéticas automotivas

Projeto de estudo de **Next.js 16 (App Router)** com **Prisma 7 + PostgreSQL**, seguindo o design do AutoCare / Brilho Pro. Em produção roda na **Vercel** com o banco no **Neon**.

- **App do cliente (PWA)**: encontra estéticas perto dele, vê serviços, preços e avaliações, e agenda em poucos toques (loja → serviço → veículo → dia e horário → confirmação). A conta (celular e senha) só é pedida na confirmação.
- **Painel de cada loja (`/admin`)**: dashboard, agendamentos, clientes, veículos, serviços e preços, estoque com baixa automática, financeiro, equipe, relatórios e configurações. Cada loja só enxerga os próprios dados.
- **Painel da plataforma (`/plataforma`)**: o dono do AutoCare aprova, suspende e reativa lojas, acompanha os números de todas e ajuda cliente que esqueceu a senha.

## Como rodar no seu PC

Precisa de Node 20+ e de um PostgreSQL. No dia a dia, o `.env` aponta pra branch **dev** do Neon (banco e bucket de fotos; veja "Fotos pelo painel"). Pra trabalhar sem internet, o Docker sobe um Postgres local (o `docker-compose.yml` já cria o banco; sem as `NEON_S3_*`, as fotos vão pra `./uploads`):

```bash
npm install
docker compose up -d                 # Postgres em localhost:5432 (banco "estetica")
copy .env.example .env               # no Windows (no Linux/Mac: cp .env.example .env) e preencha
npx prisma migrate deploy            # cria as tabelas
npm run db:seed:molinari             # a loja Molinari, o dono e o admin da plataforma (ou: npx prisma db seed, o demo)
npm run dev
```

No `.env`, gere o `SESSION_SECRET` com `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` e preencha os acessos (`PLATAFORMA_ADMIN_*`, `MOLINARI_DONO_*` e, se for usar o demo, `DEMO_SENHA`). As senhas ficam **só no `.env`**, nunca no código nem aqui.

- App do cliente: http://localhost:3000
- Painel da loja: http://localhost:3000/admin (login: `MOLINARI_DONO_EMAIL` e `MOLINARI_DONO_SENHA`)
- Painel da plataforma: http://localhost:3000/plataforma (login: `PLATAFORMA_ADMIN_EMAIL` e `PLATAFORMA_ADMIN_SENHA`)

Uma loja nova se cadastra em `/admin/cadastro` e nasce **pendente**: o dono já configura tudo, mas ela só aparece no app depois de aprovada em `/plataforma` (e de ter pelo menos um serviço).

Outros comandos úteis: `npx prisma studio` (ver o banco), `npm run build && npm start` (modo produção; o service worker do PWA só é registrado nele), `npm run test:e2e` (testes, veja "Conta do cliente").

> Mudou o banco com o `npm run dev` aberto (rodou um seed, por exemplo)? Reinicie o servidor: a lista de lojas e os serviços ficam em cache (`"use cache"`).

## Scripts de banco: qual usar

| Script | Onde pode rodar | O que faz |
| --- | --- | --- |
| `npm run db:seed:molinari` | **Em qualquer lugar, inclusive no Neon (produção)** | Cria só o que falta: a loja Molinari (dados públicos na constante `LOJA` do `prisma/seed-molinari.ts`, já `ATIVA`), os horários, os 7 serviços padrão com preço por tipo de veículo (sem ficha técnica), o dono (`MOLINARI_DONO_*`) e o admin da plataforma (`PLATAFORMA_ADMIN_*`). **Nunca apaga nada** e pode rodar quantas vezes quiser. |
| `npm run db:reset:local` | **Só no seu PC** | Apaga **todos** os dados e roda o `db:seed:molinari`. Pede pra digitar `APAGAR` e se recusa a rodar com `NODE_ENV=production` ou com `neon.tech` na URL do banco. |
| `npx prisma db seed` | **Só no seu PC** | Demonstração: apaga tudo e cria 4 lojas com 60 dias de histórico + 1 loja pendente. Se recusa a rodar em produção ou no Neon. Todos os usuários do demo usam a senha `DEMO_SENHA`; os e-mails aparecem no fim do script. |
| `npx prisma migrate deploy` | Em qualquer lugar | Aplica as migrations que faltam (na Vercel ele roda sozinho no `vercel-build`). |

Como o `db:seed:molinari` é idempotente:

- **Loja**: upsert pelo slug. Na primeira vez cria; depois não sobrescreve o que o dono editou no painel nem o status que a plataforma definiu (só completa a logo, se ela ainda estiver vazia).
- **Horários**: só os dias que ainda não existem.
- **Serviços**: só se a loja ainda não tiver nenhum.
- **Usuários** (dono e admin da plataforma): só se o e-mail ainda não existir. A senha de quem já existe nunca muda.

Ele não cria produtos, estoque, clientes, veículos, agendamentos, avaliações nem despesas. O dono cadastra os produtos e monta a ficha técnica de cada serviço pelo painel, e os clientes se cadastram pelo app. Sem ficha técnica, concluir um serviço não mexe no estoque.

Os ids nunca são zerados (nem pelo reset): um cookie antigo guarda um id e, se a numeração recomeçasse, poderia abrir a conta de outra pessoa.

## Logo de cada loja

A logo pode entrar de dois jeitos:

- **Pelo painel** (o normal): em Configurações > Dados da loja, campo "Logo". Ela vai pro Neon Object Storage como as outras fotos, mantendo a transparência.
- **Como arquivo fixo do projeto** (`npm run logo:loja`), útil pra deixar a logo pronta já na implantação:
  1. Coloque a logo (PNG, de preferência com fundo transparente) em `public/lojas/<slug>-logo.png`.
  2. Rode `npm run logo:loja -- <slug>`. Ele gera `public/lojas/<slug>-logo.webp` (altura máxima de 256 px, mantendo a transparência) e apaga o PNG. Também aceita o caminho de outro arquivo: `npm run logo:loja -- <slug> C:\caminho\logo.png`.
  3. Grave `logoUrl = "/lojas/<slug>-logo.webp"` na loja (use o `npx prisma studio` ou o seed da loja). Pra Molinari, o `db:seed:molinari` já faz isso, mas só se o arquivo existir (senão a loja fica com a logo padrão: o nome em dourado).
  4. Faça commit do `.webp` e um novo deploy (os arquivos do `public/` entram no build).

Trocar uma logo fixa pelo painel nunca apaga o arquivo do `public/` (só o que foi enviado pelo painel é apagado).

Sem logo e sem foto, o app usa os padrões: o nome da loja em dourado (`LogoLoja`) e um fundo com o desenho de um carro (`Foto`).

## Fotos pelo painel (Neon Object Storage)

As fotos de serviço, a capa e a logo da loja são enviadas pelo painel e ficam no **Neon Object Storage** (compatível com S3), no bucket público `fotos` do projeto `autocare`. Cada branch do Neon tem o próprio storage: a `production` atende a Vercel e a `dev`, o seu PC.

- **Ligar e desligar**: `UPLOADS_HABILITADOS="true"` mostra os campos de foto; `"false"` esconde e as actions ignoram qualquer arquivo. Sem a variável: ligado no `npm run dev` e desligado em produção.
- **No navegador** (`components/admin/campo-imagem.tsx`): antes de enviar, a foto é reduzida num canvas (lado maior de 1600 px, WebP ou JPEG), mirando menos de 1,5 MB. Assim uma foto de celular de 10 MB passa pelo limite de 4,5 MB da Vercel. O limite das server actions é 4 MB (`next.config.ts`); se mesmo reduzida a foto passar disso, aparece uma mensagem pedindo outra.
- **No servidor** (`lib/uploads.ts`): a foto é redimensionada de novo e convertida pra WebP com sharp, ganha um nome único (uuid) e é gravada com `Content-Type: image/webp` e `Cache-Control: public, max-age=31536000, immutable`. No banco fica a URL pública completa: `<NEON_S3_ENDPOINT>/fotos/<uuid>.webp`, que abre sem credencial (o bucket é *public read*).
- **Troca e remoção**: a foto antiga é apagada do bucket. Se apagar falhar, só fica registrado no log (a tela do dono não quebra).
- **Sem as variáveis `NEON_S3_*`**: as fotos vão pra pasta `./uploads`, servida pela rota `/arquivos/[nome]`. Serve só no seu PC: a Vercel não guarda arquivos em disco.

| Variável | O que é |
| --- | --- |
| `NEON_S3_ENDPOINT` | endpoint S3 da branch (sem barra no fim) |
| `NEON_S3_REGION` | região da branch (o projeto está em `us-east-2`, Ohio) |
| `NEON_S3_ACCESS_KEY_ID` | `token_id` da credencial de storage da branch |
| `NEON_S3_SECRET_ACCESS_KEY` | `s3_secret_access_key` da credencial (aparece uma vez só, na criação) |
| `NEON_S3_BUCKET` | `fotos` |

O prefixo é `NEON_S3_` (e não `AWS_`) porque a Vercel reserva os nomes `AWS_*`. O cliente S3 é o `@aws-sdk/client-s3` com `forcePathStyle: true`, `requestChecksumCalculation: "WHEN_REQUIRED"` e as credenciais passadas explicitamente.

**Branches do Neon** (projeto `autocare`, `still-sun-47891691`, região `us-east-2`):

- `production`: banco e bucket da Vercel.
- `dev`: criada a partir da production. É a do seu PC: o `.env` aponta pro banco e pro bucket dela. A dev herdou o bucket `fotos` (público) da production; o bucket `uploads` (privado, criado junto com o projeto) não é usado pelo app.

**Credenciais de storage** (CLI do Neon logada com `neon login`; o segredo aparece uma vez só e **nunca** vai pra arquivo versionado):

```bash
neon credentials create --project-id still-sun-47891691 --branch dev --name app-dev-fotos --scope storage:read --scope storage:write
neon credentials list   --project-id still-sun-47891691 --branch dev   # ver as existentes
neon credentials revoke <token_id> --project-id still-sun-47891691 --branch dev   # se vazar: revogue e crie outra
```

O endpoint e a região de cada branch saem de `neon api /projects/still-sun-47891691/branches/<id-da-branch>/storage`. As URLs do banco, de `neon connection-string dev --project-id still-sun-47891691 [--pooled]`. Não é preciso `neon link`; se usar, linke sempre a **dev** e passe `--no-env-pull --no-config` (senão ele reescreve o `.env` e oferece criar um `neon.ts`).

## Deploy (Vercel + Neon)

O repositório Git é a pasta de fora e o app fica na subpasta `estetica-automotiva` (na Vercel: **Root Directory** = `estetica-automotiva`). O banco é o Neon (PostgreSQL), e o app usa o `@prisma/adapter-pg` (driver `pg`), que funciona igual no Neon e no Postgres local.

**Duas URLs do banco**:

- `DATABASE_URL`: a connection string **pooled** do Neon (o host tem `-pooler`). É a que o app usa nas funções da Vercel.
- `DIRECT_URL`: a connection string **direta** (sem `-pooler`). É a que o Prisma usa pra migrations e seeds (`prisma.config.ts`), porque o pooler não aceita tudo que o migrate faz.
- Nas duas, troque `sslmode=require` por `sslmode=verify-full` (é o que o driver `pg` já faz hoje; deixar explícito evita o aviso de mudança de comportamento da próxima versão).

**Build**: a Vercel roda o script `vercel-build` (`prisma generate && prisma migrate deploy && next build`), então cada deploy aplica as migrations novas antes do build. O build também lê o banco (a tela inicial com a lista de lojas é pré-renderizada), por isso o banco precisa estar pronto (migrations + `db:seed:molinari`) **antes** do primeiro deploy.

**Segredos**: nenhum fica no código. Em produção o app **não sobe** sem um `SESSION_SECRET` forte (32+ caracteres, diferente do exemplo); o erro aparece nos logs da Vercel.

**Variáveis na Vercel** (Settings > Environment Variables, só no ambiente *Production*). Os valores de produção ficam no arquivo `.env.producao`, só no seu PC (está no `.gitignore`): a Vercel aceita colar o conteúdo dele de uma vez (Import .env).

| Variável | Valor |
| --- | --- |
| `DATABASE_URL` | connection string pooled do Neon (com `-pooler`) |
| `DIRECT_URL` | connection string direta do Neon (sem `-pooler`) |
| `SESSION_SECRET` | um valor novo, gerado só pra produção |
| `UPLOADS_HABILITADOS` | `true` |
| `NEON_S3_ENDPOINT` | endpoint S3 da branch **production** |
| `NEON_S3_REGION` | região da branch production |
| `NEON_S3_ACCESS_KEY_ID` | `token_id` da credencial de storage da production |
| `NEON_S3_SECRET_ACCESS_KEY` | `s3_secret_access_key` da credencial da production |
| `NEON_S3_BUCKET` | `fotos` |

As `NEON_S3_*` da Vercel são as da branch **production**; as do seu `.env`, as da **dev** (veja "Fotos pelo painel").

`PLATAFORMA_ADMIN_*` e `MOLINARI_DONO_*` só são usados pelo `db:seed:molinari`, que você roda do seu PC apontando pro Neon. Não precisam ficar na Vercel.

**Rodar migrations e seed no Neon a partir do seu PC** (PowerShell; as variáveis da sessão valem mais que as do `.env`):

```powershell
$env:DATABASE_URL = "<connection string pooled do Neon>"
$env:DIRECT_URL   = "<connection string direta do Neon>"
npx prisma migrate deploy
npm run db:seed:molinari          # usa PLATAFORMA_ADMIN_* e MOLINARI_DONO_* do .env (ou de $env:...)
Remove-Item Env:DATABASE_URL, Env:DIRECT_URL   # volta a usar o banco local
```

Rodou o seed depois de um deploy? Faça um **Redeploy** na Vercel: a tela inicial foi pré-renderizada no build.

## Estrutura

```
prisma/
  schema.prisma        Loja, Usuario, Servico, Produto, Agendamento, Avaliacao... (PostgreSQL)
  migrations/          migrations do Postgres (aplicadas com prisma migrate deploy)
  banco.ts             PrismaClient dos scripts + travas (Neon, admin da plataforma pelo .env)
  seed-molinari.ts     produção: cria o que falta da Molinari, nunca apaga (npm run db:seed:molinari)
  reset-local.ts       só no PC: zera o banco e roda o seed da Molinari (npm run db:reset:local)
  seed.ts              demo: 4 lojas ativas + 1 pendente, 26 clientes, ~740 agendamentos (só no PC)
  catalogo-padrao.ts   7 serviços e 10 produtos usados pelos scripts
scripts/
  logo-loja.mjs        converte a logo de uma loja pra public/lojas/<slug>-logo.webp
e2e/                   testes de ponta a ponta (Playwright)
docker-compose.yml     Postgres local
src/
  proxy.ts             barra /admin, /plataforma e as telas de conta sem login (o antigo middleware.ts)
  instrumentation.ts   em produção, não deixa o app subir com SESSION_SECRET fraco
  app/
    (cliente)/                    app do cliente (route group: não aparece na URL)
      page.tsx                      01 escolher a loja (busca, localização, favoritas)
      loja/[slug]/page.tsx          02 página da loja (serviços, avaliações, sobre)
      loja/[slug]/servico/[id]/     03 detalhes do serviço
      loja/[slug]/agendar/          04-06 veículo, calendário e confirmação
      agendamento/[codigo]/         "ticket" do agendamento, cancelar, avaliar
      meus-agendamentos/            agendamentos feitos pelo app com a conta (exige login)
      conta/                        entrar/, criar/, nova-senha/ e a tela da conta (+ actions)
    admin/
      login/  cadastro/
      bloqueado/                    loja suspensa, funcionário desativado ou sessão que não vale mais
      (painel)/                     tudo que tem o menu lateral
        page.tsx                      dashboard
        agendamentos/ clientes/ veiculos/ servicos/ estoque/
        financeiro/ equipe/ relatorios/ configuracoes/
    plataforma/
      login/
      (painel)/                     painel do dono do AutoCare
        page.tsx                      cartões + lista de lojas (filtro e busca)
        lojas/[id]/                   detalhe da loja: aprovar, suspender, reativar
    arquivos/[nome]/route.ts        serve as imagens de ./uploads (quando não há NEON_S3_*)
  lib/
    catalogo.ts        lojas, serviços, horários e avaliações com "use cache"
    agenda.ts          cálculo de horários livres
    conta.ts           conta do cliente: senha, sessão, bloqueio por senhas erradas, senha temporária
    dal.ts             exigirAdmin() / exigirDono(): checagem de acesso + lojaId; exigirPlataforma()
    sessao.ts          cookies assinados (JWT): sessao_admin, sessao_plataforma e sessao_cliente
    prisma.ts          PrismaClient do app (adapter-pg, DATABASE_URL)
    plataforma.ts      números de todas as lojas pro painel da plataforma
    relatorios.ts      números do dashboard, financeiro e relatórios
    uploads.ts         fotos: WebP com sharp, envio/remoção no Neon Object Storage (S3) ou ./uploads
    format.ts          moeda, datas, telefone, distância (roda no servidor e no navegador)
```

## Multi-loja (o ponto mais importante)

O cliente é do app inteiro (ele agenda em qualquer loja). Todo o resto pertence a uma loja: serviços, produtos, agendamentos, despesas, usuários. A regra é:

1. `exigirAdmin()` devolve o usuário logado **com o `lojaId`**.
2. Toda consulta do painel filtra por esse `lojaId`. Pra buscar por id, use `findFirst({ where: { id, lojaId } })` e não `findUnique({ where: { id } })`, senão alguém troca o número na URL e vê dado de outra loja.

## Painel da plataforma

É o painel do dono do AutoCare, em `/plataforma`. O login é separado do das lojas: model `AdminPlataforma`, cookie `sessao_plataforma` e `exigirPlataforma()` no `lib/dal.ts`. Não tem cadastro pela tela; o admin é criado pelo `db:seed:molinari` a partir de `PLATAFORMA_ADMIN_*`.

Cada loja tem uma situação (`Loja.status`), que só a plataforma muda:

| Status | No app do cliente | No painel da loja |
| --- | --- | --- |
| `PENDENTE` (toda loja nova) | Não aparece | O dono entra e configura tudo, com o aviso "Sua loja está em análise" |
| `ATIVA` | Aparece, se o dono deixar ligada (`ativa`) e tiver serviço ativo | Normal |
| `SUSPENSA` | Some, e o agendamento é bloqueado no servidor | Ninguém da loja entra; vê "Acesso suspenso" e o motivo |

- **`status` x `ativa`**: `status` é da plataforma; `ativa` continua sendo o liga/desliga do próprio dono (em Configurações). A loja só está no ar com `status = ATIVA` **e** `ativa = true` (`lojaPublicada()` em `lib/catalogo.ts`).
- **Telas**: `/plataforma` tem os cartões (lojas por status, agendamentos e faturamento somados dos últimos 30 dias) e a lista com filtro por status e busca por nome ou cidade, pendentes primeiro. `/plataforma/lojas/[id]` tem os dados da loja, dono e equipe, números do mês e os botões Aprovar, Suspender (com motivo) e Reativar.
- **Cache**: toda mudança de status chama `updateTag(TAG_LOJAS)` e `updateTag(tagLoja(id))`, então o app do cliente reflete na hora.
- **Prévia**: a página `/loja/[slug]` de uma loja fora do ar mostra "Esta loja não está disponível no momento" pro cliente. Quem está logado na plataforma, ou no painel da própria loja, vê a página com a faixa "Prévia: loja não publicada". Agendar continua bloqueado no servidor.
- **Agendamentos de loja suspensa**: nada é cancelado. O ticket do cliente (`/agendamento/[codigo]`) ganha um aviso e perde os botões "Pôr na agenda" e "Agendar outro serviço".
- **Sessão que deixou de valer**: se a loja é suspensa (ou o funcionário é desativado) com alguém logado, o `exigirAdmin()` manda pra `/admin/bloqueado`, que explica e tem o botão Sair. Não manda pro login porque o `proxy.ts` vê o cookie e devolveria pra `/admin`, em loop.

Pra testar: entre em `/plataforma`, aprove a "Nova Loja Estética" e veja ela aparecer na tela inicial do app; depois suspenda e tente entrar em `/admin/login` com `admin@novaloja.com` (senha `DEMO_SENHA`). Isso usa o seed de demonstração.

## Conceitos do Next 16 que aparecem aqui

**Cache Components (`cacheComponents: true`)**: vem ligado no projeto novo. O que lê dado da requisição (cookie, data/hora atual, banco ao vivo) precisa estar dentro de um `<Suspense>`. Por isso quase toda página tem o formato:

```tsx
export default function Pagina() {
  return (
    <Suspense fallback={<Carregando />}>
      <Conteudo />   {/* async, lê cookie / banco */}
    </Suspense>
  );
}
```

**`"use cache"` + `cacheTag`** (`lib/catalogo.ts`): a lista de lojas e a página de cada loja ficam em cache. Quando o dono muda um preço ou foto, a server action chama `updateTag(tagLoja(id))` e o cliente já vê a mudança.

**`connection()`**: em páginas que dependem da data/hora atual (agenda, ticket), `await connection()` diz "isso só roda na hora da requisição", pra o Next não "congelar" o resultado no build.

**Server Actions** (`actions.ts` com `"use server"`): todos os formulários, inclusive o upload de foto (quando ligado, o `bodySizeLimit` sobe no `next.config.ts`).

**`useActionState`**: formulários que mostram erro. Nos que têm foto, o envio é feito com `startTransition` pra o React não limpar o formulário quando dá erro.

**`useSyncExternalStore`** (`components/cliente/guardado.ts`): lê localização e favoritas do `localStorage` sem `useEffect`.

## Conta do cliente (celular e senha)

O cliente do app tem conta com **celular e senha** (bcrypt, mínimo 8 caracteres). Não tem e-mail, SMS nem nenhum serviço de terceiro. As regras ficam em `lib/conta.ts` e as actions em `app/(cliente)/conta/actions.ts`.

- **Telas**: `/conta/entrar`, `/conta/criar` (nome, celular com máscara, senha e confirmação) e `/conta` (editar nome, trocar senha, ver os veículos, "Sair deste aparelho"). No menu de baixo aparece "Entrar" ou "Minha conta".
- **Sessão**: cookie `sessao_cliente`, assinado com jose, `httpOnly`, `secure` em produção, `sameSite=lax`, 30 dias. Ele leva uma "impressão" da senha: trocar a senha (ou a plataforma gerar uma temporária) derruba as sessões abertas nos outros aparelhos. O cookie antigo da verificação por código (`cliente`) não é mais lido.
- **Rotas protegidas**: `/meus-agendamentos` e `/conta` mandam pra `/conta/entrar?voltar=...`. O `voltar` só aceita caminho interno (`/algo`); qualquer outra coisa vira `/meus-agendamentos`.
- **Agendar**: serviço, veículo, dia e horário são escolhidos sem login. No passo de confirmação, quem não está logado entra ou cria a conta ali mesmo, sem perder as escolhas. Nome e celular vêm da conta, e o veículo fica salvo nela. No servidor, `confirmarAgendamento` exige a conta e não aceita nome nem celular do formulário.
- **Origem (APP x BALCAO)**: `Agendamento.origem` e `Veiculo.origem`. O que o cliente faz logado no app é `APP`; o que a loja lança no painel é `BALCAO`. "Meus horários" e a tela da conta mostram **só** o que é `APP`. Agendamentos de balcão ficam só no painel da loja.
- **Celular que já era de balcão**: criar conta com um celular que existe como cliente sem senha usa o mesmo registro (os agendamentos e veículos de balcão continuam fora da conta). Se o celular já tem senha: "Esse celular já tem conta. Entrar?".
- **Força bruta**: cada senha errada conta na tabela `TentativaLogin`, por celular (tendo conta ou não). Na 5ª errada seguida, o login daquele celular fica bloqueado por 15 minutos, com mensagem clara. Fora isso, a mensagem é sempre "Celular ou senha incorretos." A tentativa é contada antes de conferir a senha, então várias ao mesmo tempo não passam do limite.
- **Ticket** `/agendamento/CODIGO`: qualquer um com o link vê. Cancelar e avaliar só o dono logado (agendamento `APP` da conta dele); a tela mostra os botões só pra ele, e as actions conferem no servidor.
- **Esqueci a senha**: `/conta/entrar` diz "Fale com a loja onde você agendou" e mostra o link `wa.me` de cada loja (é só um link). A plataforma busca o cliente pelo celular em `/plataforma/clientes` e usa "Gerar senha temporária": a senha aparece uma única vez, o login desse celular é desbloqueado e, no próximo login, o cliente é obrigado a criar uma senha nova (`/conta/nova-senha`) antes de qualquer outra tela.

Limite conhecido: não há verificação do celular. Quem criar conta primeiro com um número fica com ele; se o dono real aparecer, a plataforma resolve gerando uma senha temporária pra ele (o que derruba a sessão de quem tinha criado).

### Testes de ponta a ponta (Playwright)

```bash
npx playwright install chromium   # só na primeira vez
docker compose up -d              # o Postgres local precisa estar no ar
npm run test:e2e                  # todos, num banco local de teste
npm run test:e2e:dev              # só o das fotos, na branch dev do Neon (banco e bucket do .env)
```

Os testes ficam em `e2e/`. O `test:e2e` usa um banco só dele, `estetica_e2e` (o `docker-compose.yml` já cria): a cada rodada, `e2e/preparar-banco.mjs` zera esse banco, aplica as migrations e roda o `db:seed:molinari`; depois vem o build de produção e o `npm start` na porta 3200. As fotos vão pro bucket do `.env` (o da dev) e o teste remove tudo o que enviou. O `test:e2e:dev` não zera nada: roda só o teste das fotos na branch dev, entrando com o dono da Molinari (`MOLINARI_DONO_*` do `.env`), e também remove tudo no fim. O Neon de produção nunca é tocado.

Cobrem: envio de foto grande (> 5 MB) num serviço, que aparece no app do cliente e abre sem credencial; troca da foto, com a antiga apagada do bucket; logo (com transparência) e capa da loja; todas as telas do painel da loja e da plataforma com o banco zerado (sem erro, sem "NaN", com mensagens amigáveis); o app do cliente sem nenhuma foto; o dono atender até concluir um serviço sem ficha técnica (sem mexer no estoque); rodar o `db:seed:molinari` de novo sem duplicar nem apagar nada; e, da conta do cliente: criar conta, sair e entrar; bloqueio depois de 5 senhas erradas; agendar sem login (a conta é pedida na confirmação e a escolha não se perde); duas contas sem ver os agendamentos uma da outra; balcão fora da conta; outro cliente sem conseguir cancelar pelo link (nem chamando a action direto); senha temporária pela plataforma.

## Regras de negócio

- **Vagas simultâneas**: um horário fica livre se, durante todo o serviço, tiver menos carros que vagas (`cabeNoHorario`). A conferência é refeita dentro de uma transação na hora de salvar.
- **Ficha técnica**: cada serviço diz quanto gasta de cada produto num carro (moto 50%, SUV 130%, caminhonete 150%). Ao concluir, o funcionário confirma as quantidades e o estoque baixa.
- **Lucro estimado** = recebido − produtos usados − despesas.
- **Conta do cliente**: celular e senha, pedida só na hora de confirmar o agendamento. Detalhes em "Conta do cliente". O link `/agendamento/CODIGO` abre pra qualquer um, mas só o dono logado cancela e avalia.
- **Avaliação**: só depois do serviço concluído, uma por agendamento. A nota média aparece na lista de lojas.

## Ideias pra evoluir

- Lembrete automático no WhatsApp um dia antes + push notification do PWA
- Pagamento antecipado com Pix (sinal pra reduzir falta)
- Cartão fidelidade (a cada 10 lavagens, 1 grátis) e cupons por loja
- Fotos do antes e depois no agendamento
- Comissão por funcionário (quem lavou cada carro)
- Mapa com as lojas na tela inicial
