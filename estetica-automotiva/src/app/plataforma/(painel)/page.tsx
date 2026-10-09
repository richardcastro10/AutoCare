import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import type { StatusLoja } from "@/generated/prisma/enums";
import { exigirPlataforma } from "@/lib/dal";
import { lojasDaPlataforma } from "@/lib/plataforma";
import { NOME_STATUS_LOJA, STATUS_LOJA } from "@/lib/constantes";
import { formatarDataHora, formatarDia, formatarMoeda, formatarNota, hojeISO, normalizar } from "@/lib/format";
import { Cabecalho, Carregando, Numero, Secao, Vazio } from "@/components/admin/ui";
import { StatusLojaChip } from "@/components/status-chip";
import { IconeCalendario, IconeCheckCirculo, IconeCifrao, IconeEstrela, IconeRelogio, IconeSino } from "@/components/icones";

export const metadata: Metadata = { title: "Lojas da plataforma" };

export default function Plataforma(props: PageProps<"/plataforma">) {
  return (
    <Suspense fallback={<Carregando />}>
      <Conteudo {...props} />
    </Suspense>
  );
}

async function Conteudo({ searchParams }: PageProps<"/plataforma">) {
  await exigirPlataforma();
  const { q, status } = await searchParams;
  const busca = typeof q === "string" ? q.trim() : "";
  const filtro = STATUS_LOJA.find((s) => s === status);

  const todas = await lojasDaPlataforma(hojeISO());

  // os cartões somam todas as lojas; busca e filtro valem só pra lista
  const porStatus = (s: StatusLoja) => todas.filter((l) => l.status === s).length;
  const agendamentos = todas.reduce((t, l) => t + l.agendamentos30, 0);
  const faturamento = todas.reduce((t, l) => t + l.faturamento30, 0);

  const termo = normalizar(busca);
  const lojas = todas.filter(
    (l) =>
      (!filtro || l.status === filtro) &&
      (!termo || normalizar(l.nome).includes(termo) || normalizar(l.cidade).includes(termo)),
  );

  // link de filtro que mantém a busca digitada
  const link = (s?: StatusLoja) => {
    const params = new URLSearchParams();
    if (busca) params.set("q", busca);
    if (s) params.set("status", s);
    const texto = params.toString();
    return texto ? `/plataforma?${texto}` : "/plataforma";
  };

  return (
    <div className="space-y-5">
      <Cabecalho titulo="Lojas" descricao="Quem está liberado no AutoCare. Os números são dos últimos 30 dias." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
        <Numero
          icone={<IconeSino className="size-6" />}
          cor="dourado"
          rotulo="Pendentes"
          valor={porStatus("PENDENTE")}
          tom={porStatus("PENDENTE") ? "alerta" : "normal"}
          detalhe={porStatus("PENDENTE") ? "Esperando sua aprovação" : "Nada pra aprovar"}
        />
        <Numero
          icone={<IconeCheckCirculo className="size-6" />}
          cor="menta"
          rotulo="Ativas"
          valor={porStatus("ATIVA")}
          detalhe={`de ${todas.length} ${todas.length === 1 ? "loja" : "lojas"}`}
        />
        <Numero
          icone={<IconeRelogio className="size-6" />}
          cor="perigo"
          rotulo="Suspensas"
          valor={porStatus("SUSPENSA")}
          tom={porStatus("SUSPENSA") ? "negativo" : "normal"}
          detalhe="Fora do app e sem acesso"
        />
        <Numero
          icone={<IconeCalendario className="size-6" />}
          cor="info"
          rotulo="Agendamentos"
          valor={agendamentos}
          detalhe="Todas as lojas, 30 dias"
        />
        <Numero
          icone={<IconeCifrao className="size-6" />}
          cor="menta"
          rotulo="Faturamento"
          valor={formatarMoeda(faturamento)}
          detalhe="Todas as lojas, 30 dias"
        />
      </div>

      <Secao
        titulo="Todas as lojas"
        acao={
          <span className="text-sm text-texto-suave">
            {lojas.length} de {todas.length}
          </span>
        }
      >
        <div className="flex flex-wrap items-center gap-3 px-4 pb-4 pt-2">
          <form className="flex min-w-0 flex-1 gap-2">
            {filtro && <input type="hidden" name="status" value={filtro} />}
            <input
              name="q"
              defaultValue={busca}
              placeholder="Buscar por nome ou cidade"
              className="campo max-w-sm"
              type="search"
            />
            <button className="btn-secundario">Buscar</button>
          </form>
          <nav aria-label="Filtrar por status" className="flex rounded-lg border border-borda p-0.5 text-sm">
            {[undefined, ...STATUS_LOJA].map((s) => (
              <Link
                key={s ?? "todas"}
                href={link(s)}
                aria-current={filtro === s ? "true" : undefined}
                className={`whitespace-nowrap rounded-md px-3 py-1.5 ${filtro === s ? "bg-superficie-2 text-texto" : "text-texto-suave hover:text-texto"}`}
              >
                {s ? `${NOME_STATUS_LOJA[s]}s` : "Todas"}
              </Link>
            ))}
          </nav>
        </div>

        {lojas.length === 0 ? (
          <Vazio>Nenhuma loja encontrada.</Vazio>
        ) : (
          <div className="overflow-x-auto border-t border-borda">
            <table className="tabela min-w-[940px]">
              <thead>
                <tr>
                  <th>Loja</th>
                  <th>Status</th>
                  <th>Cadastro</th>
                  <th className="text-right">Agendamentos</th>
                  <th className="text-right">Faturamento</th>
                  <th>Nota</th>
                  <th>Último acesso do dono</th>
                </tr>
              </thead>
              <tbody>
                {lojas.map((l) => (
                  <tr key={l.id}>
                    <td>
                      <Link href={`/plataforma/lojas/${l.id}`} className="font-semibold text-texto hover:text-menta">
                        {l.nome}
                      </Link>
                      <span className="block text-sm text-texto-suave">
                        {l.cidade} - {l.uf}
                      </span>
                    </td>
                    <td>
                      <StatusLojaChip status={l.status} />
                      {l.status === "ATIVA" && !l.ativa && (
                        <span className="mt-1 block text-xs text-texto-suave">Desligada pelo dono</span>
                      )}
                    </td>
                    <td className="tabular-nums">{formatarDia(l.createdAt)}</td>
                    <td className="text-right tabular-nums">{l.agendamentos30}</td>
                    <td className="text-right tabular-nums">{formatarMoeda(l.faturamento30)}</td>
                    <td className="whitespace-nowrap tabular-nums">
                      {l.nota === null ? (
                        <span className="text-texto-fraco">-</span>
                      ) : (
                        <span className="inline-flex items-center gap-1">
                          <IconeEstrela className="size-3.5 text-dourado" />
                          {formatarNota(l.nota)}
                          <span className="text-texto-suave">({l.totalAvaliacoes})</span>
                        </span>
                      )}
                    </td>
                    <td className="tabular-nums">
                      {l.ultimoAcessoDono ? (
                        formatarDataHora(l.ultimoAcessoDono)
                      ) : (
                        <span className="text-texto-fraco">Nunca entrou</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Secao>
    </div>
  );
}
