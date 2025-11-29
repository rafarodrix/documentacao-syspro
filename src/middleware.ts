import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ---------------------------------------------------------
  // 1. DEFINIÇÃO DE ROTAS PÚBLICAS
  // ---------------------------------------------------------

  const publicRoutes = [
    "/",
    "/privacidade",
    "/termos",
    "/login",
    "/register",
    "/resetar-senha", // Permite pedir o reset
    "/recuperar-senha"  // Permite definir a nova senha (link do email)
  ];

  // Função auxiliar para verificar se é pública
  const isPublicRoute = publicRoutes.some((route) =>
    pathname === route || pathname.startsWith("/api/webhooks") // Exceção para Webhooks externos
  );

  // ---------------------------------------------------------
  // 2. VERIFICAÇÃO DE SESSÃO (Better Auth)
  // ---------------------------------------------------------

  // O Better Auth usa esses cookies. Em HTTPS produtivo usa o prefixo __Secure-
  const sessionToken =
    request.cookies.get("better-auth.session_token") ||
    request.cookies.get("__Secure-better-auth.session_token");

  const isAuthenticated = !!sessionToken;

  // ---------------------------------------------------------
  // 3. LÓGICA DE PROTEÇÃO (Fluxo Deslogado)
  // ---------------------------------------------------------

  // Se o usuário tenta acessar uma rota protegida (Admin ou App) SEM estar logado
  if (!isPublicRoute && !isAuthenticated) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("callbackUrl", pathname); // Guarda a intenção para redirecionar depois
    return NextResponse.redirect(url);
  }

  // ---------------------------------------------------------
  // 4. LÓGICA DE REDIRECIONAMENTO (Fluxo Logado)
  // ---------------------------------------------------------

  // Se o usuário JÁ LOGADO tenta acessar Login ou Register
  if ((pathname === "/login" || pathname === "/register") && isAuthenticated) {
    const url = request.nextUrl.clone();

    // Redireciona para o Painel do Cliente (/app) por padrão.
    url.pathname = "/app";
    return NextResponse.redirect(url);
  }

  // Se passou por tudo, segue o fluxo normal
  return NextResponse.next();
}

export const config = {
  // O matcher ignora arquivos estáticos e rotas internas do Next/Auth
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};