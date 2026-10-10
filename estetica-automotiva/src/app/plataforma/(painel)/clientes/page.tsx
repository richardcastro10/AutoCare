import type { Metadata } from "next";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { exigirPlataforma } from "@/lib/dal";
import { formatarDia, formatarTelefone, somenteDigitos } from "@/lib/format";
import { Cabecalho, Carregando, Secao, Vazio } from "@/components/admin/ui";
import { FormSenhaTemporaria } from "./form-senha";

export const metadata: Metadata = { title: "Clientes do app" };

// Atendimento do "esqueci a senha": a loja avisa, a plataforma acha o cliente pelo celular
// e gera uma senha temporária. Não tem e-mail nem SMS no app.
export default function ClientesPlataforma(props: PageProps<"/plataforma/clientes">) {
  return (
    <Suspense fallback={<Carregando />}>
      <Conteudo {...props} />
    </Suspense>
  );
}

async function Conteudo({ searchParams }: PageProps<"/plataforma/clientes">) {
  await exigirPlataforma();
  const { celular } = await searchParams;
  const digitado = typeof celular === "string" ? celular.trim() : "";
  const telefone = somenteDigitos(digitado);

  const cliente =
    telefone.length >= 10
      ? await prisma.cliente.findUnique({
          where: { telefone },
          select: {
            id: true,
            nome: true,
            telefone: true,
            senhaHash: true,
            senhaTemporaria: true,
            contaCriadaEm: true,
            createdAt: true,
          },
        })
      : null;
  const [doApp, doBalcao, tentativa] = cliente
    ? await Promise.all([
        prisma.agendamento.count({ where: { clienteId: cliente.id, origem: "APP" } }),
        prisma.agendamento.count({ where: { clienteId: cliente.id, origem: "BALCAO" } }),
        prisma.tentativaLogin.findUnique({ where: { telefone: cliente.telefone } }),
      ])
    : [0, 0, null];
  const bloqueado = !!tentativa?.bloqueadoAte && tentativa.bloqueadoAte > new Date();

  return (
    <div className="max-w-3xl space-y-5">
      <Cabecalho titulo="Clientes do app" descricao="Busque pelo celular pra ajudar quem esqueceu a senha." />

      <form className="flex gap-2">
        <label htmlFor="celular" className="sr-only">
          Celular do cliente
        </label>
        <input
          id="celular"
          name="celular"
          type="tel"
          inputMode="numeric"
          defaultValue={digitado}
          placeholder="Celular com DDD, ex.: (13) 99999-9999"
          className="campo max-w-sm"
          required
        />
        <button className="btn-secundario">Buscar</button>
      </form>

      {digitado && !cliente && <Vazio>Nenhum cliente com esse celular.</Vazio>}

      {cliente && (
        <Secao titulo={cliente.nome}>
          <dl className="grid gap-3 px-4 pb-2 pt-1 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-texto-suave">Celular</dt>
              <dd>{formatarTelefone(cliente.telefone)}</dd>
            </div>
            <div>
              <dt className="text-xs text-texto-suave">Conta no app</dt>
              <dd>
                {cliente.senhaHash
                  ? `Desde ${cliente.contaCriadaEm ? formatarDia(cliente.contaCriadaEm) : formatarDia(cliente.createdAt)}`
                  : "Não tem (só balcão)"}
                {cliente.senhaTemporaria && <span className="ml-2 text-dourado">· senha temporária pendente</span>}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-texto-suave">Agendamentos</dt>
              <dd>
                {doApp} pelo app · {doBalcao} no balcão
              </dd>
            </div>
            <div>
              <dt className="text-xs text-texto-suave">Login</dt>
              <dd className={bloqueado ? "text-perigo" : ""}>
                {bloqueado ? "Bloqueado por senhas erradas (libera ao gerar a senha)" : "Liberado"}
              </dd>
            </div>
          </dl>
          <div className="p-4 pt-2">
            {/* key: buscar outro cliente zera o formulário (e a senha mostrada) */}
            <FormSenhaTemporaria key={cliente.id} clienteId={cliente.id} temConta={!!cliente.senhaHash} />
          </div>
        </Secao>
      )}
    </div>
  );
}
