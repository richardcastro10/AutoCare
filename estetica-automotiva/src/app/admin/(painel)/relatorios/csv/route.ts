// GET /admin/relatorios/csv -> planilha com os serviços concluídos dos últimos 12 meses
// (abre no Excel / Google Planilhas)
import { prisma } from "@/lib/prisma";
import { exigirDono } from "@/lib/dal";
import { NOME_PAGAMENTO, NOME_VEICULO } from "@/lib/constantes";
import { formatarData, hojeISO, minutosParaHora, somarDias } from "@/lib/format";

export async function GET() {
  const { lojaId, loja } = await exigirDono();
  const hoje = hojeISO();

  const agendamentos = await prisma.agendamento.findMany({
    where: { lojaId, status: "CONCLUIDO", data: { gte: somarDias(hoje, -365), lte: hoje } },
    include: { cliente: true, veiculo: true, itens: true, consumos: { select: { custoTotal: true } } },
    orderBy: [{ data: "desc" }, { inicio: "desc" }],
  });

  // Excel em português usa ";" como separador e vírgula decimal
  const reais = (centavos: number) => (centavos / 100).toFixed(2).replace(".", ",");
  const celula = (valor: string | number) => `"${String(valor).replaceAll('"', '""')}"`;

  const linhas = [
    ["Data", "Hora", "Cliente", "Veículo", "Tipo", "Placa", "Serviços", "Total", "Desconto", "Recebido", "Pagamento", "Custo produtos"],
    ...agendamentos.map((a) => [
      formatarData(a.data),
      minutosParaHora(a.inicio),
      a.cliente.nome,
      a.veiculo.modelo,
      NOME_VEICULO[a.veiculo.tipo],
      a.veiculo.placa,
      a.itens.map((i) => i.nomeServico).join(" + "),
      reais(a.total),
      reais(a.desconto),
      reais(a.valorPago ?? 0),
      a.formaPagamento ? NOME_PAGAMENTO[a.formaPagamento] : "",
      reais(a.consumos.reduce((t, c) => t + c.custoTotal, 0)),
    ]),
  ];

  // ﻿ no começo faz o Excel reconhecer os acentos (UTF-8)
  const csv = "﻿" + linhas.map((l) => l.map(celula).join(";")).join("\r\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${loja.slug}-servicos-${hoje}.csv"`,
    },
  });
}
