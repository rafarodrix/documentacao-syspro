import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ---------------------------------------------------------
  // 1. DEFINIÇÃO DE ROTAS PÚBLICAS
  // ---------------------------------------------------------

  const publicRoutes = [
    "/",
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
    "/privacidade",
    "/termos",
  ];

  const isDocsRoute = pathname === "/docs" || pathname.startsWith("/docs/");
  const isReleasesRoute = pathname === "/releases" || pathname.startsWith("/releases/");

  // Verifica se a rota exata está na lista ou se é uma rota pública de API/Webhook
  const isPublicRoute =
    publicRoutes.includes(pathname) ||
    isDocsRoute ||
    isReleasesRoute ||
    pathname.startsWith("/api/webhooks") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/search") ||
    pathname.startsWith("/api/revalidate"); // Garante que endpoints públicos não sejam bloqueados

  // ---------------------------------------------------------
  // 2. VERIFICAÇÃO DE SESSÃO
  // ---------------------------------------------------------

  const sessionToken =
    request.cookies.get("better-auth.session_token") ||
    request.cookies.get("__Secure-better-auth.session_token");

  const isAuthenticated = !!sessionToken;

  // ---------------------------------------------------------
  // 3. PROTEÇÃO DE ROTAS (Bloqueia acesso não autorizado)
  // ---------------------------------------------------------

  if (!isPublicRoute && !isAuthenticated) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  // ---------------------------------------------------------
  // 4. REDIRECIONAMENTO INTELIGENTE (Usuário já logado)
  // ---------------------------------------------------------

  // Se já está logado e tenta acessar páginas de auth, manda para a raiz.
  // Lá na raiz (page.tsx), faremos a verificação de Role para mandar 
  // Admin -> /admin e Cliente -> /app
  if (isAuthenticated && (pathname === "/login" || pathname === "/register")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Matcher otimizado:
  // Ignora arquivos estáticos, imagens e ícones para não gastar processamento
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
