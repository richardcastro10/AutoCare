import type { StatusAgendamento, StatusLoja } from "@/generated/prisma/enums";
import { COR_STATUS, COR_STATUS_LOJA, NOME_STATUS, NOME_STATUS_CURTO, NOME_STATUS_LOJA } from "@/lib/constantes";

export function StatusChip({ status, curto }: { status: StatusAgendamento; curto?: boolean }) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${COR_STATUS[status]}`}
    >
      {curto ? NOME_STATUS_CURTO[status] : NOME_STATUS[status]}
    </span>
  );
}

/** Chip da situação da loja na plataforma */
export function StatusLojaChip({ status }: { status: StatusLoja }) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${COR_STATUS_LOJA[status]}`}
    >
      {NOME_STATUS_LOJA[status]}
    </span>
  );
}
