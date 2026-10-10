# AutoCare: marketplace de estéticas automotivas

Projeto de estudo de **Next.js 16 (App Router)** com **Prisma 7 + SQLite**, seguindo o design do AutoCare / Brilho Pro.

- **App do cliente (PWA)**: encontra estéticas perto dele, vê serviços, preços e avaliações, e agenda em poucos toques (loja → serviço → veículo → dia e horário → confirmação). A conta (celular e senha) só é pedida na confirmação.
- **Painel de cada loja (`/admin`)**: dashboard, agendamentos, clientes, veículos, serviços e preços (com foto), estoque com baixa automática, financeiro, equipe, relatórios e configurações. Cada loja só enxerga os próprios dados.
- **Painel da plataforma (`/plataforma`)**: o dono do AutoCare aprova, suspende e reativa lojas e acompanha os números de todas.

## Como rodar

```bash
npm install
copy .env.example .env               # no Windows (no Linux/Mac: cp .env.example .env)
npx prisma migrate dev --name init   # cria o banco prisma/lavagem.db
npx prisma generate                  # gera o client em src/generated/prisma
npx prisma db seed                   # 4 lojas com 60 dias de histórico + 1 loja pendente (leva alguns minutos)
npm run dev
```

- App do cliente: http://localhost:3000
- Painel da loja: http://localhost:3000/admin
- Painel da plataforma: http://localhost:3000/plataforma

| Onde | Acesso | Login | Senha |
| --- | --- | --- | --- |
| `/plataforma` | Dono do AutoCare | `dono@autocare.com` | `admin123` |
| `/admin` | Brilho Pro Estética (dono) | `admin@brilhopro.com` | `admin123` |
| `/admin` | Brilho Pro Estética (funcionário) | `lucas@brilhopro.com` | `lucas123` |
| `/admin` | Lava Car Ponta da Praia | `admin@lavacar.com` | `admin123` |
| `/admin` | Spa do Carro | `admin@spadocarro.com` | `admin123` |
| `/admin` | Garagem Detail | `admin@garagemdetail.com` | `admin123` |
| `/admin` | Nova Loja Estética (pendente de aprovação) | `admin@novaloja.com` | `admin123` |

Uma loja nova se cadastra em `/admin/cadastro` e nasce **pendente**: o dono já configura tudo, mas ela só aparece no app depois de aprovada em `/plataforma` (e de ter pelo menos um serviço).

> Rodou o seed de novo com o `npm run dev` aberto? Reinicie o servidor. A lista de lojas e os serviços
> ficam em cache (`"use cache"`) e o seed recria tudo com ids novos.

Outros comandos úteis: `npx prisma studio` (ver o banco), `npm run build && npm start` (modo produção; o service worker do PWA só é registrado nele).

As fotos enviadas pelo painel ficam na pasta `uploads/` (fora do `public/`) e são servidas pela rota `/arquivos/[nome]`.

## Implantação Molinari

O banco pode ser preparado pra uso real com a loja Molinari, no lugar do demo. O script `prisma/seed-molinari.ts` **apaga todos os dados** (lojas, clientes, agendamentos, acessos, tentativas de login) e cria só:

- o admin da plataforma (`dono@autocare.com` / `admin123`);
- a Molinari, já aprovada (`ATIVA`) e ligada, com 2 vagas, segunda a sábado das 08:00 às 18:00 e domingo fechado;
- os 7 serviços e os 10 produtos do catálogo padrão (`prisma/catalogo-padrao.ts`, o mesmo do demo, sem ajuste de preço), com a ficha técnica e uma compra inicial de estoque por produto;
- o dono da loja.

Sem clientes, agendamentos, avaliações nem despesas: os clientes se cadastram pelo app.

1. Os dados públicos da loja (nome, WhatsApp, endereço, bairro, cidade, horário, vagas) ficam na constante `LOJA`, no topo do `prisma/seed-molinari.ts`.
2. Nome, e-mail e senha do dono ficam **só no `.env`** (o repositório é público). Os nomes das variáveis estão no `.env.example`:
   ```
   MOLINARI_DONO_NOME="..."
   MOLINARI_DONO_EMAIL="..."
   MOLINARI_DONO_SENHA="..."
   ```
3. Rode:
   ```bash
   npm run db:seed:molinari
   ```
   O script confere tudo antes de apagar: se faltar algum dado (ou ainda estiver com `PREENCHER` ou o valor de exemplo), ele avisa e não mexe no banco.
4. Reinicie o `npm run dev`: a lista de lojas fica em cache e ainda mostraria as lojas do demo.

| Onde | Acesso | Login | Senha |
| --- | --- | --- | --- |
| `/admin` | Dono da Molinari | `MOLINARI_DONO_EMAIL` do `.env` | `MOLINARI_DONO_SENHA` do `.env` |
| `/plataforma` | Dono do AutoCare | `dono@autocare.com` | `admin123` |

Depois de implantar:

- O estoque inicial é só um número de partida (16 vezes o mínimo de cada produto). O dono ajusta pela contagem real em Estoque. Essa compra não entra como despesa no Financeiro.
- Latitude e longitude ficam em branco: o dono preenche em Configurações (sem elas, o app não mostra a distância até a loja).
- Troque as senhas iniciais. A do dono se troca em Configurações; a do admin da plataforma ainda não tem tela.
- Os ids não são zerados de propósito: um cookie antigo do demo guarda um id e, se a numeração recomeçasse, poderia abrir a conta de outra pessoa. Com a numeração seguindo, esses cookies só deixam de valer.

**Voltar pro demo**: `npx prisma db seed` recria as 5 lojas de exemplo (apaga a Molinari). Antes da implantação, o banco do demo foi copiado pra `prisma/lavagem-backup-demo.db`; pra restaurar essa cópia, pare o servidor e copie o arquivo por cima de `prisma/lavagem.db`.

## Estrutura

```
prisma/
  schema.prisma        Loja, Usuario, Servico, Produto, Agendamento, Avaliacao...
  seed.ts              demo: admin da plataforma, 4 lojas ativas + 1 pendente, 26 clientes, ~740 agendamentos
  seed-molinari.ts     implantação real: apaga tudo e cria só a Molinari (npm run db:seed:molinari)
  catalogo-padrao.ts   7 serviços e 10 produtos usados pelos dois scripts
src/
  proxy.ts             barra /admin e /plataforma sem login (o antigo middleware.ts)
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
    arquivos/[nome]/route.ts        serve as imagens enviadas
  lib/
    catalogo.ts        lojas, serviços, horários e avaliações com "use cache"
    agenda.ts          cálculo de horários livres
    conta.ts           conta do cliente: senha, sessão, bloqueio por senhas erradas, senha temporária
    dal.ts             exigirAdmin() / exigirDono(): checagem de acesso + lojaId; exigirPlataforma()
    sessao.ts          cookies assinados (JWT): sessao_admin, sessao_plataforma e cliente
    plataforma.ts      números de todas as lojas pro painel da plataforma
    relatorios.ts      números do dashboard, financeiro e relatórios
    uploads.ts         salva imagem (redimensiona e converte pra WebP com sharp)
    format.ts          moeda, datas, telefone, distância (roda no servidor e no navegador)
```

## Multi-loja (o ponto mais importante)

O cliente é do app inteiro (ele agenda em qualquer loja). Todo o resto pertence a uma loja: serviços, produtos, agendamentos, despesas, usuários. A regra é:

1. `exigirAdmin()` devolve o usuário logado **com o `lojaId`**.
2. Toda consulta do painel filtra por esse `lojaId`. Pra buscar por id, use `findFirst({ where: { id, lojaId } })` e não `findUnique({ where: { id } })`, senão alguém troca o número na URL e vê dado de outra loja.

## Painel da plataforma

É o painel do dono do AutoCare, em `/plataforma`. O login é separado do das lojas: model `AdminPlataforma`, cookie `sessao_plataforma` e `exigirPlataforma()` no `lib/dal.ts`. Não tem cadastro pela tela; o admin é criado no seed.

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

Pra testar: entre em `/plataforma`, aprove a "Nova Loja Estética" e veja ela aparecer na tela inicial do app; depois suspenda e tente entrar em `/admin/login` com `admin@novaloja.com`.

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

**`connection()`**: o `better-sqlite3` é síncrono; sem isso o Next poderia "congelar" a consulta no build. `await connection()` diz "isso só roda na hora da requisição".

**Server Actions** (`actions.ts` com `"use server"`): todos os formulários, inclusive o upload de foto (`bodySizeLimit` aumentado no `next.config.ts`).

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
npm run build
npm run test:e2e
```

Os testes ficam em `e2e/` e rodam o build de produção na porta 3200 apontando pra `prisma/e2e.db`, uma cópia do banco feita na hora (`e2e/preparar-banco.mjs`, que também cria um cliente de balcão). O banco de verdade não é tocado. Cobrem: criar conta, sair e entrar; bloqueio depois de 5 senhas erradas; agendar sem login (a conta é pedida na confirmação e a escolha não se perde); duas contas sem ver os agendamentos uma da outra; balcão fora da conta; outro cliente sem conseguir cancelar pelo link (nem chamando a action direto); senha temporária pela plataforma.

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
- Trocar SQLite por PostgreSQL pra colocar em produção (só muda o `provider` e o adapter)
