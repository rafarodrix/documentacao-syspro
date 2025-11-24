import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ---------------------------------------------------------
  // 1. DEFINIÇÃO DE ROTAS
  // ---------------------------------------------------------

  // Rotas que não precisam de autenticação
  const publicRoutes = [
    "/",
    "/login",
    "/releases", // Notas de versão
    "/suporte"   // Se houver uma landing page de suporte pública
  ];

  // Verifica se a rota atual começa com algum dos caminhos públicos
  const isPublicRoute = publicRoutes.some((route) =>
    pathname === route || pathname.startsWith(`${route}/`)
  );

  // ---------------------------------------------------------
  // 2. VERIFICAÇÃO DE SESSÃO
  // ---------------------------------------------------------

  // Tenta obter o token. Em produção (HTTPS), ele pode ter o prefixo __Secure-
  const sessionToken =
    request.cookies.get("better-auth.session_token") ||
    request.cookies.get("__Secure-better-auth.session_token");

  const isAuthenticated = !!sessionToken;

  // ---------------------------------------------------------
  // 3. LÓGICA DE REDIRECIONAMENTO
  // ---------------------------------------------------------

  // CASO A: Usuário tenta acessar rota protegida SEM estar logado
  if (!isPublicRoute && !isAuthenticated) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("callbackUrl", pathname); // Salva onde ele queria ir
    return NextResponse.redirect(url);
  }

  // CASO B: Usuário JÁ LOGADO tenta acessar a página de login
  // (Melhoria de UX: joga ele direto pro painel)
  if (pathname === "/login" && isAuthenticated) {
    const url = request.nextUrl.clone();
    // Redireciona para a home do admin ou dashboard
    url.pathname = "/admin/empresas";
    return NextResponse.redirect(url);
  }

  // Permite a navegação normal
  return NextResponse.next();
}

export const config = {
  // Matcher: Executa em tudo, EXCETO:
  // - /api/auth (rotas internas do better auth)
  // - /_next (arquivos de build do next)
  // - /static, /favicon.ico, imagens, etc.
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};