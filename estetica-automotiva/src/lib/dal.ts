// DAL = Data Access Layer.
// Toda página/ação do painel chama exigirAdmin(). O proxy.ts já barra quem não tem
// cookie, mas a verificação "de verdade" acontece aqui, perto dos dados.
// O lojaId que vem daqui é o que filtra TODAS as consultas do painel.
import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  COOKIE_ADMIN,
  COOKIE_CLIENTE,
  COOKIE_PLATAFORMA,
  lerCliente,
  lerSessaoAdmin,
  lerSessaoPlataforma,
} from "./sessao";
import { getLojaCompleta, getSituacaoPorSlug, type LojaCompleta } from "./catalogo";
import { prisma } from "./prisma";

// cache() do React: se várias partes da mesma página chamarem exigirAdmin(),
// a consulta ao banco roda uma vez só por requisição
export const exigirAdmin = cache(async () => {
  const token = (await cookies()).get(COOKIE_ADMIN)?.value;
  const sessao = await lerSessaoAdmin(token);
  if (!sessao) redirect("/admin/login");

  const usuario = await prisma.usuario.findUnique({
    where: { id: sessao.usuarioId },
    select: {
      id: true,
      nome: true,
      email: true,
      papel: true,
      ativo: true,
      lojaId: true,
      loja: { select: { id: true, nome: true, slug: true, logoUrl: true, status: true } },
    },
  });
  // O cookie ainda vale, mas o acesso não: usuário apagado/desativado ou loja suspensa.
  // Não dá pra mandar pro /admin/login: o proxy vê o cookie e devolve pra /admin (loop).
  // A tela /admin/bloqueado explica o motivo e tem o botão que apaga o cookie.
  if (!usuario || !usuario.ativo || usuario.loja.status === "SUSPENSA") redirect("/admin/bloqueado");

  return usuario;
});

/** Só o dono (ADMIN) mexe em financeiro, preços, equipe e configurações */
export async function exigirDono() {
  const usuario = await exigirAdmin();
  if (usuario.papel !== "ADMIN") redirect("/admin/agendamentos");
  return usuario;
}

/** Dono da plataforma AutoCare: toda página/ação de /plataforma chama isso */
export const exigirPlataforma = cache(async () => {
  const token = (await cookies()).get(COOKIE_PLATAFORMA)?.value;
  const sessao = await lerSessaoPlataforma(token);
  if (!sessao) redirect("/plataforma/login");

  const admin = await prisma.adminPlataforma.findUnique({
    where: { id: sessao.adminId },
    select: { id: true, nome: true, email: true },
  });
  if (!admin) redirect("/plataforma/login");

  return admin;
});

export async function clienteAtualId() {
  const token = (await cookies()).get(COOKIE_CLIENTE)?.value;
  return lerCliente(token);
}

// ---------- Página da loja no app (com prévia pra loja não publicada) ----------

/**
 * Quem pode ver a página de uma loja que não está no ar:
 * o dono da plataforma (qualquer loja) e a equipe logada da própria loja,
 * desde que ela não esteja suspensa.
 */
async function podeVerPrevia(lojaId: number) {
  const guardados = await cookies();

  const plataforma = await lerSessaoPlataforma(guardados.get(COOKIE_PLATAFORMA)?.value);
  if (plataforma) {
    const admin = await prisma.adminPlataforma.findUnique({ where: { id: plataforma.adminId }, select: { id: true } });
    if (admin) return true;
  }

  const sessao = await lerSessaoAdmin(guardados.get(COOKIE_ADMIN)?.value);
  if (!sessao) return false;
  const usuario = await prisma.usuario.findUnique({
    where: { id: sessao.usuarioId },
    select: { ativo: true, lojaId: true, loja: { select: { status: true } } },
  });
  return !!usuario && usuario.ativo && usuario.lojaId === lojaId && usuario.loja.status !== "SUSPENSA";
}

export type LojaNoApp =
  | { situacao: "ok"; loja: LojaCompleta; previa: boolean }
  | { situacao: "indisponivel" }
  | null; // slug não existe

/**
 * Usada pelas páginas /loja/[slug]. Loja no ar: devolve do cache, sem ler cookie.
 * Loja fora do ar: só devolve os dados pra quem pode ver a prévia.
 * O agendamento continua bloqueado no servidor em qualquer prévia.
 */
export async function getLojaNoApp(slug: string): Promise<LojaNoApp> {
  const situacao = await getSituacaoPorSlug(slug);
  if (!situacao) return null;
  if (!situacao.publicada && !(await podeVerPrevia(situacao.id))) return { situacao: "indisponivel" };

  const loja = await getLojaCompleta(situacao.id);
  return loja ? { situacao: "ok", loja, previa: !situacao.publicada } : null;
}
