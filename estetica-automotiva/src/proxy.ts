import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_ADMIN, COOKIE_PLATAFORMA, lerSessaoAdmin, lerSessaoPlataforma } from "@/lib/sessao";

// Roda antes das rotas /admin e /plataforma. É uma checagem "otimista" (só olha o cookie):
// a checagem completa (usuário existe, está ativo, loja não suspensa) fica no lib/dal.ts.
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

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
  matcher: ["/admin", "/admin/:path*", "/plataforma", "/plataforma/:path*"],
};
