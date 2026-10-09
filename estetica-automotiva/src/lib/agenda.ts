// Regras da agenda: quais dias abrem e quais horários estão livres.
import "server-only";
import { randomInt } from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";
import { STATUS_ATIVOS } from "./constantes";
import type { LojaCompleta } from "./catalogo";
import { agoraEmMinutos, diaDaSemana, hojeISO, somarDias } from "./format";
import { prisma } from "./prisma";

type Db = typeof prisma | Prisma.TransactionClient;

export type DiaAgenda = {
  data: string;
  aberto: boolean;
  motivo?: string;
};

/** Dias que aparecem pro cliente escolher (de hoje até o limite da loja) */
export function proximosDias(loja: LojaCompleta): DiaAgenda[] {
  const hoje = hojeISO();
  const agora = agoraEmMinutos();
  const antecedencia = loja.antecedenciaMinHoras * 60;

  return Array.from({ length: loja.diasAntecedenciaMax + 1 }, (_, i) => {
    const data = somarDias(hoje, i);
    const horario = loja.horarios[diaDaSemana(data)];
    const bloqueio = loja.bloqueios.find((b) => b.data === data);

    if (bloqueio) return { data, aberto: false, motivo: bloqueio.motivo };
    if (!horario.aberto) return { data, aberto: false, motivo: "Fechado" };
    // hoje, mas já passou do último horário possível
    if (i === 0 && agora + antecedencia >= horario.fecha) {
      return { data, aberto: false, motivo: "Encerrado hoje" };
    }
    return { data, aberto: true };
  });
}

/**
 * Lista os horários de início livres para um serviço de `duracao` minutos.
 * Um horário é livre quando, durante todo o período, o número de carros
 * sendo lavados ao mesmo tempo é menor que o número de vagas da loja.
 */
export async function horariosLivres(
  loja: LojaCompleta,
  data: string,
  duracao: number,
  db: Db = prisma,
): Promise<number[]> {
  const dia = proximosDias(loja).find((d) => d.data === data);
  if (!dia?.aberto || duracao <= 0) return [];

  const horario = loja.horarios[diaDaSemana(data)];
  const ocupados = await db.agendamento.findMany({
    where: { lojaId: loja.id, data, status: { in: STATUS_ATIVOS } },
    select: { inicio: true, fim: true },
  });

  const minimo = data === hojeISO() ? agoraEmMinutos() + loja.antecedenciaMinHoras * 60 : 0;
  const livres: number[] = [];

  for (let inicio = horario.abre; inicio + duracao <= horario.fecha; inicio += loja.intervaloSlotMin) {
    if (inicio < minimo) continue;
    if (cabeNoHorario(ocupados, inicio, inicio + duracao, loja.vagasSimultaneas)) livres.push(inicio);
  }
  return livres;
}

/**
 * Verifica se um novo serviço de `inicio` até `fim` cabe na agenda.
 * Olha a lotação em cada ponto onde ela pode mudar (início do intervalo e
 * inícios de outros agendamentos dentro dele).
 */
export function cabeNoHorario(
  ocupados: { inicio: number; fim: number }[],
  inicio: number,
  fim: number,
  vagas: number,
) {
  const pontos = [inicio, ...ocupados.map((o) => o.inicio).filter((p) => p > inicio && p < fim)];
  const lotacaoMaxima = Math.max(
    ...pontos.map((p) => ocupados.filter((o) => o.inicio <= p && p < o.fim).length),
  );
  return lotacaoMaxima < vagas;
}

const ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sem 0/O, 1/I

/** Código curto que vai no link do cliente, ex.: "K7PX2MQA" */
export function gerarCodigo() {
  return Array.from({ length: 8 }, () => ALFABETO[randomInt(ALFABETO.length)]).join("");
}
