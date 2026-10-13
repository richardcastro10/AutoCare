import type { Metadata } from "next";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { exigirAdmin } from "@/lib/dal";
import { DIAS_SEMANA } from "@/lib/constantes";
import { formatarData, hojeISO, minutosParaHora } from "@/lib/format";
import { Cabecalho, Carregando, Secao, Vazio } from "@/components/admin/ui";
import { BotaoEnviar } from "@/components/admin/botao-enviar";
import { adicionarBloqueio, removerBloqueio, salvarAgenda, salvarHorarios } from "./actions";
import { FormLoja } from "./form-loja";
import { uploadsHabilitados } from "@/lib/uploads";
import { FormSenha } from "./form-senha";

export const metadata: Metadata = { title: "Configurações" };

export default function Configuracoes() {
  return (
    <Suspense fallback={<Carregando />}>
      <Conteudo />
    </Suspense>
  );
}

async function Conteudo() {
  const eu = await exigirAdmin();
  const dono = eu.papel === "ADMIN";
  const hoje = hojeISO();

  // aqui lemos direto do banco (sem cache), pra mostrar sempre o valor salvo
  const loja = await prisma.loja.findUniqueOrThrow({
    where: { id: eu.lojaId },
    include: {
      horarios: true,
      bloqueios: { where: { data: { gte: hoje } }, orderBy: { data: "asc" } },
    },
  });

  return (
    <div className="max-w-4xl space-y-6">
      <Cabecalho titulo="Configurações" descricao={dono ? "Dados da loja, agenda e acesso." : "Seu acesso ao painel."} />

      {dono && (
        <>
          <Secao titulo="Dados da loja">
            <FormLoja loja={loja} uploads={uploadsHabilitados()} />
          </Secao>

          <Secao titulo="Agenda">
            <form action={salvarAgenda} className="space-y-4 p-4">
              <div className="grid gap-4 sm:grid-cols-4">
                <div>
                  <label className="rotulo" htmlFor="vagasSimultaneas">
                    Carros ao mesmo tempo
                  </label>
                  <input id="vagasSimultaneas" name="vagasSimultaneas" type="number" min={1} className="campo" defaultValue={loja.vagasSimultaneas} />
                </div>
                <div>
                  <label className="rotulo" htmlFor="intervaloSlotMin">
                    Horários a cada (min)
                  </label>
                  <select id="intervaloSlotMin" name="intervaloSlotMin" className="campo" defaultValue={loja.intervaloSlotMin}>
                    {[15, 20, 30, 60].map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="rotulo" htmlFor="antecedenciaMinHoras">
                    Antecedência mínima (h)
                  </label>
                  <input id="antecedenciaMinHoras" name="antecedenciaMinHoras" type="number" min={0} className="campo" defaultValue={loja.antecedenciaMinHoras} />
                </div>
                <div>
                  <label className="rotulo" htmlFor="diasAntecedenciaMax">
                    Agenda aberta por (dias)
                  </label>
                  <input id="diasAntecedenciaMax" name="diasAntecedenciaMax" type="number" min={1} max={90} className="campo" defaultValue={loja.diasAntecedenciaMax} />
                </div>
              </div>
              <div className="flex justify-end">
                <BotaoEnviar>Salvar agenda</BotaoEnviar>
              </div>
            </form>
          </Secao>

          <Secao titulo="Horário de funcionamento">
            <form action={salvarHorarios} className="p-4">
              <ul className="divide-y divide-borda">
                {[1, 2, 3, 4, 5, 6, 0].map((dia) => {
                  const h = loja.horarios.find((x) => x.diaSemana === dia) ?? { aberto: false, abre: 480, fecha: 1080 };
                  return (
                    <li key={dia} className="flex flex-wrap items-center gap-3 py-2">
                      <label className="flex w-36 items-center gap-2 text-sm font-medium">
                        <input type="checkbox" name={`aberto_${dia}`} defaultChecked={h.aberto} className="size-4 accent-menta" />
                        {DIAS_SEMANA[dia]}
                      </label>
                      <input type="time" name={`abre_${dia}`} defaultValue={minutosParaHora(h.abre)} className="campo w-32 py-1.5" aria-label={`${DIAS_SEMANA[dia]}: abre`} />
                      <span className="text-sm text-texto-suave">até</span>
                      <input type="time" name={`fecha_${dia}`} defaultValue={minutosParaHora(h.fecha)} className="campo w-32 py-1.5" aria-label={`${DIAS_SEMANA[dia]}: fecha`} />
                    </li>
                  );
                })}
              </ul>
              <div className="mt-3 flex justify-end">
                <BotaoEnviar>Salvar horários</BotaoEnviar>
              </div>
            </form>
          </Secao>

          <Secao titulo="Dias fechados (feriados, manutenção)">
            <form action={adicionarBloqueio} className="flex flex-wrap items-end gap-3 p-4">
              <div>
                <label className="rotulo" htmlFor="data">
                  Data
                </label>
                <input id="data" name="data" type="date" min={hoje} className="campo" required />
              </div>
              <div className="min-w-48 flex-1">
                <label className="rotulo" htmlFor="motivo">
                  Motivo (o cliente vê)
                </label>
                <input id="motivo" name="motivo" className="campo" placeholder="Feriado" />
              </div>
              <BotaoEnviar pendente="...">Fechar esse dia</BotaoEnviar>
            </form>
            {loja.bloqueios.length === 0 ? (
              <Vazio>Nenhum dia fechado à frente.</Vazio>
            ) : (
              <ul className="divide-y divide-borda border-t border-borda">
                {loja.bloqueios.map((b) => (
                  <li key={b.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                    <span>
                      <strong className="tabular-nums">{formatarData(b.data)}</strong>{" "}
                      <span className="text-texto-suave">{b.motivo}</span>
                    </span>
                    <form action={removerBloqueio.bind(null, b.id)}>
                      <button className="text-texto-suave hover:text-menta">Reabrir</button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </Secao>
        </>
      )}

      <Secao titulo="Minha senha">
        <FormSenha />
      </Secao>
    </div>
  );
}
