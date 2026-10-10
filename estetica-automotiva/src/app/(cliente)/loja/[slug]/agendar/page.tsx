import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { connection } from "next/server";
import { prisma } from "@/lib/prisma";
import { getLojaPorSlug } from "@/lib/catalogo";
import { proximosDias } from "@/lib/agenda";
import { clienteAtual } from "@/lib/dal";
import { Assistente } from "./assistente";

export const metadata: Metadata = { title: "Agendar" };

// Telas 04, 05 e 06 do design: veículo, data/horário e confirmação
export default function Agendar(props: PageProps<"/loja/[slug]/agendar">) {
  return (
    <Suspense fallback={<Carregando />}>
      <Conteudo {...props} />
    </Suspense>
  );
}

async function Conteudo({ params, searchParams }: PageProps<"/loja/[slug]/agendar">) {
  await connection(); // depende do dia/hora atual: só na hora da requisição
  const { slug } = await params;
  const { servico: servicoParam } = await searchParams;

  const loja = await getLojaPorSlug(slug);
  // loja fora do ar não agenda (nem na prévia): volta pra página da loja, que explica
  // (se o slug nem existir, é ela que dá o 404)
  if (!loja) redirect(`/loja/${slug}`);
  const servico = loja.servicos.find((s) => s.id === Number(servicoParam));
  if (!servico) redirect(`/loja/${slug}`); // sem serviço escolhido, volta pra loja

  // Escolher não precisa de login. Se já está logado, traz nome, celular e os veículos
  // da conta (só os do app). Sem login, a conta é pedida só na confirmação.
  const logado = await clienteAtual();
  const cliente =
    logado && !logado.senhaTemporaria
      ? {
          nome: logado.nome,
          telefone: logado.telefone,
          veiculos: await prisma.veiculo.findMany({
            where: { clienteId: logado.id, origem: "APP" },
            select: { id: true, tipo: true, modelo: true, placa: true },
            orderBy: { createdAt: "desc" },
          }),
        }
      : null;

  return (
    <Assistente
      loja={{
        id: loja.id,
        slug: loja.slug,
        nome: loja.nome,
        cidade: loja.cidade,
        uf: loja.uf,
      }}
      servico={servico}
      dias={proximosDias(loja)}
      cliente={cliente}
    />
  );
}

function Carregando() {
  return (
    <div className="space-y-3 p-4" aria-busy>
      <div className="h-7 w-40 animate-pulse rounded bg-superficie" />
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-20 animate-pulse rounded-xl bg-superficie" />
      ))}
    </div>
  );
}
