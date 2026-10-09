import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { COOKIE_ADMIN, lerSessaoAdmin } from "@/lib/sessao";
import { LogoPlataforma } from "@/components/marca";
import { sair } from "../login/actions";

export const metadata: Metadata = { title: "Acesso bloqueado" };

// Pra onde o exigirAdmin() manda quem tem cookie válido mas não pode mais entrar:
// loja suspensa pela plataforma, funcionário desativado ou usuário que não existe mais.
// (Uma página não consegue apagar cookie; quem apaga é o botão, que chama a action sair.)
export default function Bloqueado() {
  return (
    <main className="grid min-h-dvh place-items-center bg-[radial-gradient(ellipse_at_50%_0%,#14303c,transparent_60%)] px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <LogoPlataforma />
        </div>
        <div className="painel p-6">
          <Suspense fallback={<div className="h-32 animate-pulse rounded bg-superficie-2" />}>
            <Motivo />
          </Suspense>
        </div>
      </div>
    </main>
  );
}

async function Motivo() {
  // aqui NÃO dá pra usar exigirAdmin(): ele mandaria de volta pra esta página
  const sessao = await lerSessaoAdmin((await cookies()).get(COOKIE_ADMIN)?.value);
  if (!sessao) redirect("/admin/login");

  const usuario = await prisma.usuario.findUnique({
    where: { id: sessao.usuarioId },
    select: { ativo: true, papel: true, loja: { select: { status: true, motivoStatus: true } } },
  });

  let titulo = "Sua sessão não vale mais";
  let texto = "Entre de novo com seu e-mail e senha.";
  let motivo = "";
  if (usuario?.loja.status === "SUSPENSA") {
    titulo = "Acesso suspenso";
    texto = "Acesso suspenso. Fale com o suporte.";
    motivo = usuario.loja.motivoStatus;
  } else if (usuario && !usuario.ativo) {
    titulo = "Acesso desativado";
    texto = "Seu acesso ao painel foi desativado. Fale com o administrador da loja.";
  } else if (usuario) {
    // está tudo certo (ex.: a loja foi reativada): volta pro painel
    redirect(usuario.papel === "ADMIN" ? "/admin" : "/admin/agendamentos");
  }

  return (
    <>
      <h1 className="titulo text-xl">{titulo}</h1>
      <p role="alert" className="mt-3 rounded-md bg-perigo/10 px-3 py-2 text-sm text-perigo">
        {texto}
        {motivo && <span className="mt-1 block text-texto-suave">Motivo: {motivo}</span>}
      </p>
      <form action={sair} className="mt-5">
        <button className="btn-secundario w-full">Sair</button>
      </form>
    </>
  );
}
