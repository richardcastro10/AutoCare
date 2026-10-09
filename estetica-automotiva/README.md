# AutoCare: marketplace de estéticas automotivas

Projeto de estudo de **Next.js 16 (App Router)** com **Prisma 7 + SQLite**, seguindo o design do AutoCare / Brilho Pro.

- **App do cliente (PWA)**: encontra estéticas perto dele, vê serviços, preços e avaliações, e agenda em poucos toques (loja → serviço → veículo → dia e horário → confirmação), sem senha: ele só confirma o WhatsApp com um código de 6 números.
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

## Estrutura

```
prisma/
  schema.prisma        Loja, Usuario, Servico, Produto, Agendamento, Avaliacao...
  seed.ts              admin da plataforma, 4 lojas ativas + 1 pendente, 26 clientes, ~740 agendamentos
src/
  proxy.ts             barra /admin e /plataforma sem login (o antigo middleware.ts)
  app/
    (cliente)/                    app do cliente (route group: não aparece na URL)
      page.tsx                      01 escolher a loja (busca, localização, favoritas)
      loja/[slug]/page.tsx          02 página da loja (serviços, avaliações, sobre)
      loja/[slug]/servico/[id]/     03 detalhes do serviço
      loja/[slug]/agendar/          04-06 veículo, calendário e confirmação
      agendamento/[codigo]/         "ticket" do agendamento, cancelar, avaliar
      meus-agendamentos/            "Entrar com WhatsApp", lista e "Sair deste aparelho" (+ actions do código)
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
    verificacao.ts     código de 6 dígitos do WhatsApp: gerar, limites e conferir
    whatsapp.ts        enviarMensagem(): hoje só mostra no terminal (ponto pra plugar a API)
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

## Verificação do WhatsApp

O cliente não tem senha. O que prova que o número é dele é um código de 6 dígitos (`lib/verificacao.ts` + actions em `meus-agendamentos/actions.ts`):

- **Onde aparece**: no último passo do agendamento (nome, WhatsApp, "Receber código", 6 dígitos; só então "Confirmar agendamento" é liberado) e em "Meus horários" ("Entrar com WhatsApp", pra ver os agendamentos em outro aparelho). Quem já confirmou neste aparelho não vê nada disso de novo.
- **Código**: gerado com `crypto.randomInt`, vale 10 minutos, serve uma vez e o banco guarda só o hash (`CodigoVerificacao.codigoHash`, bcrypt). Só o código mais recente de cada telefone vale.
- **Limites**: 1 pedido a cada 60 segundos e 5 por hora por telefone; 5 tentativas por código (a tentativa é contada antes de comparar).
- **Não entrega quem tem cadastro**: pedir código responde sempre "Enviamos um código pro seu WhatsApp", pra número cadastrado ou não.
- **Cookie**: só a action `verificarCodigo` grava o `COOKIE_CLIENTE`. `confirmarAgendamento` não recebe mais nome nem telefone: usa o cliente do cookie e, sem ele, recusa. Cookies de antes dessa mudança não valem mais (falta a marca `verificado` no token).
- **Nome**: número que já tem cadastro mantém o nome do banco. Número novo vira cliente com o nome digitado no agendamento. Em "Meus horários", número sem cadastro não cria cliente nem cookie ("Nenhum agendamento com esse número").
- **Envio**: `lib/whatsapp.ts` ainda não envia de verdade. Com `npm run dev`, o código aparece no terminal do servidor. Em produção o envio falha ("Não foi possível enviar o código agora"), a não ser com `WHATSAPP_CODIGO_NO_TERMINAL=1` no `.env`, que existe só pra testar `npm start` na sua máquina.

Antes de ir pra produção: plugar a API em `lib/whatsapp.ts`, apagar `WHATSAPP_CODIGO_NO_TERMINAL` e adicionar limite por IP (hoje o limite é só por telefone; tem um TODO em `lib/verificacao.ts`).

Pra testar: abra uma loja, escolha serviço, veículo e horário, informe nome e WhatsApp, toque em "Receber código" e copie o código que aparece no terminal do `npm run dev`. Os clientes do seed têm telefones como `13991000000`: use um deles em "Meus horários" pra ver um histórico cheio.

## Regras de negócio

- **Vagas simultâneas**: um horário fica livre se, durante todo o serviço, tiver menos carros que vagas (`cabeNoHorario`). A conferência é refeita dentro de uma transação na hora de salvar.
- **Ficha técnica**: cada serviço diz quanto gasta de cada produto num carro (moto 50%, SUV 130%, caminhonete 150%). Ao concluir, o funcionário confirma as quantidades e o estoque baixa.
- **Lucro estimado** = recebido − produtos usados − despesas.
- **Cliente sem senha, com WhatsApp confirmado**: o telefone identifica o cliente, mas ele só é "lembrado" no aparelho (cookie assinado) depois de digitar o código enviado pro WhatsApp. Detalhes em "Verificação do WhatsApp". O link `/agendamento/CODIGO` continua funcionando sem login em qualquer lugar: é por ele que o cliente vê, cancela e avalia.
- **Avaliação**: só depois do serviço concluído, uma por agendamento. A nota média aparece na lista de lojas.

## Ideias pra evoluir

- Lembrete automático no WhatsApp um dia antes + push notification do PWA
- Pagamento antecipado com Pix (sinal pra reduzir falta)
- Cartão fidelidade (a cada 10 lavagens, 1 grátis) e cupons por loja
- Fotos do antes e depois no agendamento
- Comissão por funcionário (quem lavou cada carro)
- Mapa com as lojas na tela inicial
- Trocar SQLite por PostgreSQL pra colocar em produção (só muda o `provider` e o adapter)
