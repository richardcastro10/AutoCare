import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { exigirAdmin } from "@/lib/dal";
import { getLojaCompleta } from "@/lib/catalogo";
import { agoraEmMinutos, hojeISO, minutosParaHora } from "@/lib/format";
import { Cabecalho, Carregando } from "@/components/admin/ui";
import { FormBalcao } from "./form";

export const metadata: Metadata = { title: "Novo agendamento" };

export default function NovoAgendamento() {
  return (
    <Suspense fallback={<Carregando />}>
      <Conteudo />
    </Suspense>
  );
}

async function Conteudo() {
  const { lojaId } = await exigirAdmin();
  const servicos = (await getLojaCompleta(lojaId))?.servicos ?? [];
  // sugere a próxima meia hora como horário
  const proximaMeiaHora = Math.ceil(agoraEmMinutos() / 30) * 30;

  return (
    <div className="max-w-3xl">
      <Link href="/admin/agendamentos" className="text-sm font-semibold text-menta">
        ‹ Voltar para a agenda
      </Link>
      <div className="mt-4">
        <Cabecalho
          titulo="Novo agendamento"
          descricao="Para cliente que chegou na loja ou ligou. Aqui você pode encaixar fora da grade de horários."
        />
      </div>
      <FormBalcao
        servicos={servicos}
        dataInicial={hojeISO()}
        horaInicial={minutosParaHora(Math.min(proximaMeiaHora, 23 * 60))}
      />
    </div>
  );
}
