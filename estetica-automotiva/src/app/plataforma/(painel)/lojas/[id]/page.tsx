import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { exigirPlataforma } from "@/lib/dal";
import { resumoDoMes } from "@/lib/relatorios";
import {
  formatarDataHora,
  formatarDia,
  formatarMes,
  formatarMoeda,
  formatarNota,
  formatarTelefone,
  hojeISO,
} from "@/lib/format";
import { Aviso, Cabecalho, Carregando, Numero, Secao, Vazio } from "@/components/admin/ui";
import { BotaoEnviar } from "@/components/admin/botao-enviar";
import { StatusLojaChip } from "@/components/status-chip";
import { IconeCalendario, IconeCifrao, IconeEstrela, IconeEtiqueta } from "@/components/icones";
import { aprovarLoja, reativarLoja } from "./actions";
import { FormSuspender } from "./form-suspender";

export const metadata: Metadata = { title: "Loja" };

export default function PaginaLojaPlataforma(props: PageProps<"/plataforma/lojas/[id]">) {
  return (
    <Suspense fallback={<Carregando />}>
      <Conteudo {...props} />
    </Suspense>
  );
}

async function Conteudo({ params }: PageProps<"/plataforma/lojas/[id]">) {
  await exigirPlataforma();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();

  const loja = await prisma.loja.findUnique({
    where: { id },
    include: {
      usuarios: {
        select: { id: true, nome: true, email: true, papel: true, ativo: true, ultimoAcesso: true },
        // dono primeiro ("ADMIN" vem antes de "FUNCIONARIO")
        orderBy: [{ papel: "asc" }, { nome: "asc" }],
      },
      _count: { select: { servicos: { where: { ativo: true } } } },
    },
  });
  if (!loja) notFound();

  const mes = hojeISO().slice(0, 7);
  const [resumo, avaliacoes] = await Promise.all([
    resumoDoMes(loja.id, mes),
    prisma.avaliacao.aggregate({ where: { lojaId: loja.id }, _avg: { nota: true }, _count: true }),
  ]);
  const semServico = loja._count.servicos === 0;

  return (
    <div className="space-y-5">
      <Link href="/plataforma" className="text-sm text-texto-suave hover:text-texto">
        ← Todas as lojas
      </Link>

      <Cabecalho
        titulo={loja.nome}
        descricao={
          <span className="flex flex-wrap items-center gap-2">
            <StatusLojaChip status={loja.status} />
            <span>
              {loja.cidade} - {loja.uf} · cadastrada em {formatarDia(loja.createdAt)}
            </span>
          </span>
        }
      >
        <Link href={`/loja/${loja.slug}`} target="_blank" className="btn-secundario">
          Ver página no app
        </Link>
      </Cabecalho>

      <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Numero
              icone={<IconeCifrao className="size-6" />}
              cor="menta"
              rotulo="Faturamento do mês"
              valor={formatarMoeda(resumo.receita)}
              detalhe={`Ticket médio ${formatarMoeda(resumo.ticketMedio)}`}
            />
            <Numero
              icone={<IconeCalendario className="size-6" />}
              cor="info"
              rotulo="Atendimentos no mês"
              valor={resumo.atendimentos}
              detalhe={`${resumo.perdidos} ${resumo.perdidos === 1 ? "cancelado ou falta" : "cancelados ou faltas"}`}
            />
            <Numero
              icone={<IconeEstrela className="size-6" />}
              cor="dourado"
              rotulo="Nota média"
              valor={avaliacoes._avg.nota === null ? "-" : formatarNota(avaliacoes._avg.nota)}
              detalhe={`${avaliacoes._count} ${avaliacoes._count === 1 ? "avaliação" : "avaliações"} no total`}
            />
            <Numero
              icone={<IconeEtiqueta className="size-6" />}
              cor={semServico ? "perigo" : "info"}
              rotulo="Serviços ativos"
              valor={loja._count.servicos}
              tom={semServico ? "negativo" : "normal"}
              detalhe={semServico ? "Sem serviço, não aparece no app" : "No catálogo do app"}
            />
          </div>
          <p className="text-xs text-texto-suave first-letter:uppercase">
            Números de {formatarMes(mes)}.
          </p>

          <Secao titulo="Dono e equipe">
            {loja.usuarios.length === 0 ? (
              <Vazio>Nenhum acesso cadastrado.</Vazio>
            ) : (
              <ul className="divide-y divide-borda">
                {loja.usuarios.map((u) => (
                  <li key={u.id} className={`flex flex-wrap items-center gap-3 px-4 py-3 ${u.ativo ? "" : "opacity-50"}`}>
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-superficie-2 text-sm font-semibold">
                      {u.nome.charAt(0).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">{u.nome}</span>
                      <span className="text-xs text-texto-suave">{u.email}</span>
                    </span>
                    <span className="text-xs text-texto-suave">
                      {u.ultimoAcesso ? `Último acesso ${formatarDataHora(u.ultimoAcesso)}` : "Nunca entrou"}
                    </span>
                    <span className="rounded-full bg-superficie-2 px-2.5 py-0.5 text-xs text-texto-suave">
                      {u.papel === "ADMIN" ? "Dono" : "Funcionário"}
                      {!u.ativo && " (desativado)"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Secao>
        </div>

        <div className="space-y-4">
          <Secao titulo="Situação na plataforma">
            <div className="space-y-3 p-4 pt-2">
              {loja.status === "PENDENTE" && (
                <p className="text-sm text-texto-suave">
                  Loja em análise: o dono já configura o painel, mas ela não aparece no app.
                </p>
              )}
              {loja.status === "ATIVA" && (
                <p className="text-sm text-texto-suave">
                  Liberada{loja.statusAlteradoEm && ` desde ${formatarDia(loja.statusAlteradoEm)}`}.
                </p>
              )}
              {loja.status === "SUSPENSA" && (
                <Aviso tipo="erro">
                  Suspensa{loja.statusAlteradoEm && ` em ${formatarDia(loja.statusAlteradoEm)}`}. Motivo:{" "}
                  {loja.motivoStatus || "não informado"}
                </Aviso>
              )}
              {loja.status === "ATIVA" && !loja.ativa && (
                <p className="text-sm text-dourado">O dono desligou a loja nas configurações: ela não aparece no app.</p>
              )}
              {loja.status !== "SUSPENSA" && semServico && (
                <p className="text-sm text-dourado">
                  Sem serviço ativo: mesmo aprovada, só aparece no app depois de cadastrar um.
                </p>
              )}

              {loja.status === "PENDENTE" && (
                <form action={aprovarLoja.bind(null, loja.id)}>
                  <BotaoEnviar pendente="Aprovando...">Aprovar</BotaoEnviar>
                </form>
              )}
              {loja.status === "SUSPENSA" && (
                <form action={reativarLoja.bind(null, loja.id)}>
                  <BotaoEnviar pendente="Reativando...">Reativar</BotaoEnviar>
                </form>
              )}
              {loja.status !== "SUSPENSA" && <FormSuspender lojaId={loja.id} />}
            </div>
          </Secao>

          <Secao titulo="Dados da loja">
            <dl className="space-y-3 p-4 pt-2 text-sm">
              <Dado rotulo="Endereço">
                {[loja.endereco, loja.bairro].filter(Boolean).join(", ") || "-"}
                <br />
                {loja.cidade} - {loja.uf}
              </Dado>
              <Dado rotulo="WhatsApp">{loja.telefone ? formatarTelefone(loja.telefone) : "-"}</Dado>
              <Dado rotulo="Endereço no app">/loja/{loja.slug}</Dado>
              {loja.descricao && <Dado rotulo="Descrição">{loja.descricao}</Dado>}
            </dl>
          </Secao>
        </div>
      </div>
    </div>
  );
}

function Dado({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-texto-suave">{rotulo}</dt>
      <dd className="mt-0.5 break-words">{children}</dd>
    </div>
  );
}
