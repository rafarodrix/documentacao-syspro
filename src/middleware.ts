import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ---------------------------------------------------------
  // 1. DEFINIÇÃO DE ROTAS PÚBLICAS
  // ---------------------------------------------------------
  const isPublicRoute = 
    pathname === "/" ||                       // Landing Page (Site)
    pathname === "/docs" ||                   // <--- AGORA PÚBLICA (Só a capa)
    pathname.startsWith("/login") ||          // Login
    pathname.startsWith("/api/auth") ||       // API Auth
    pathname.startsWith("/_next") ||          // Next.js internals
    pathname.startsWith("/static") ||         // Arquivos estáticos
    pathname.includes(".");                   // Imagens, favicons, etc

  // Se for rota pública, deixa passar direto
  if (isPublicRoute) {
    return NextResponse.next();
  }

  // ---------------------------------------------------------
  // 2. VERIFICAÇÃO DE SEGURANÇA (Para todo o resto)
  // ---------------------------------------------------------
  // Isso vai barrar: /docs/qualquer-coisa, /admin, /dashboard, etc.
  
  const sessionToken = request.cookies.get("better-auth.session_token");

  if (!sessionToken) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    // Salva onde o usuário queria ir para voltar depois
    url.searchParams.set("callbackUrl", pathname); 
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // O matcher continua igual, pegando tudo menos arquivos de sistema
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};