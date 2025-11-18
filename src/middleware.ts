import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ---------------------------------------------------------
  // 1. ROTAS PÚBLICAS (EXCEÇÕES DE SEGURANÇA)
  // ---------------------------------------------------------
  
  // Lista de padrões que o middleware deve ignorar para todos os usuários
  const PUBLIC_PATHS = [
    // Rotas da Aplicação que são Públicas
    "/",        // Landing Page
    "/docs",    // Home da Documentação (Acesso permitido)
    "/login",   // Página de Login (Acesso sempre permitido)
    
    // Rotas de Infraestrutura
    "/api/auth",   // Rotas da API do Better Auth
    "/_next",      // Arquivos de sistema do Next.js
    "/static",     // Pasta /public/static
  ];

  const isPublicRoute = PUBLIC_PATHS.some(path => 
    pathname === path || pathname.startsWith(path + "/")
  );

  // Exclui arquivos estáticos (.ico, .png, etc.)
  if (isPublicRoute || pathname.includes(".")) {
    return NextResponse.next();
  }

  // ---------------------------------------------------------
  // 2. VERIFICAÇÃO DE SESSÃO (Para todas as rotas restantes)
  // ---------------------------------------------------------
  
  // Checa a presença do cookie gerado pelo Better Auth.
  const sessionToken = request.cookies.get("better-auth.session_token");

  if (!sessionToken) {
    // Se não houver token, redireciona para Login
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    
    // Garante que o usuário volte para onde estava
    url.searchParams.set("callbackUrl", pathname); 
    
    return NextResponse.redirect(url);
  }

  // Se houver token, permite a passagem para a rota protegida
  return NextResponse.next();
}

export const config = {
  // O matcher é o mesmo, garantindo que pegamos todas as rotas que não são arquivos de sistema
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};