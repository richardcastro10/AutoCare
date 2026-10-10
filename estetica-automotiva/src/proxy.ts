import { NextResponse, type NextRequest } from "next/server";
import {
  COOKIE_ADMIN,
  COOKIE_CLIENTE,
  COOKIE_PLATAFORMA,
  lerSessaoAdmin,
  lerSessaoCliente,
  lerSessaoPlataforma,
} from "@/lib/sessao";

// Roda antes das rotas /admin, /plataforma e das telas do cliente que exigem conta.
// É uma checagem "otimista" (só olha o cookie): a checagem completa (conta existe, senha não
// mudou, usuário ativo, loja não suspensa) fica no lib/dal.ts.
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // ---- cliente do app: /meus-agendamentos e /conta (entrar e criar conta ficam abertos) ----
  if (pathname === "/meus-agendamentos" || pathname === "/conta" || pathname === "/conta/nova-senha") {
    const sessao = await lerSessaoCliente(request.cookies.get(COOKIE_CLIENTE)?.value);
    if (!sessao) {
      const entrar = new URL("/conta/entrar", request.url);
      entrar.searchParams.set("voltar", pathname + search);
      return NextResponse.redirect(entrar);
    }
    return NextResponse.next();
  }

  // ---- painel do dono da plataforma ----
  if (pathname === "/plataforma" || pathname.startsWith("/plataforma/")) {
    // o login fica sempre aberto, mesmo com cookie: se o exigirPlataforma() recusar a
    // sessão (admin apagado), ele manda pra cá e não pode voltar em loop
    if (pathname === "/plataforma/login") return NextResponse.next();
    const sessao = await lerSessaoPlataforma(request.cookies.get(COOKIE_PLATAFORMA)?.value);
    if (!sessao) return NextResponse.redirect(new URL("/plataforma/login", request.url));
    return NextResponse.next();
  }

  // ---- painel de cada loja ----
  const sessao = await lerSessaoAdmin(request.cookies.get(COOKIE_ADMIN)?.value);
  // telas abertas: entrar e cadastrar uma loja nova
  const naTelaDeLogin = pathname === "/admin/login" || pathname === "/admin/cadastro";

  if (!sessao && !naTelaDeLogin) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }
  if (sessao && naTelaDeLogin) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin",
    "/admin/:path*",
    "/plataforma",
    "/plataforma/:path*",
    "/meus-agendamentos",
    "/conta",
    "/conta/nova-senha",
  ],
};
