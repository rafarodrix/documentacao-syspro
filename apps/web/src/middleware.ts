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

  // Verifica se a rota exata está na lista ou se é uma rota pública de API/Webhook
  const isPublicRoute =
    publicRoutes.includes(pathname) ||
    pathname.startsWith("/api/webhooks") ||
    pathname.startsWith("/api/auth"); // Garante que o Auth nunca seja bloqueado

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

  // Se já está logado e tenta acessar páginas de auth ou a raiz pública,
  // redireciona para o dashboard autenticado.
  if (isAuthenticated && ["/login", "/register", "/"].includes(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
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