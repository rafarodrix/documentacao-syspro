import { NextResponse, type NextRequest } from "next/server";
import { getCookieCache } from "better-auth/cookies";
import { APP_ROLES, CADASTROS_ROUTE_RULES, SYSTEM_ROLES, hasAllowedRole, type AppRole } from "@/core/config/route-access";

type CachedRole = { role: AppRole; expiresAt: number };
type SessionCachePayload = {
  user?: {
    role?: AppRole;
  };
};

const ROLE_CACHE_TTL_MS = 30 * 1000;
const ROLE_CACHE_MAX_ITEMS = 1000;

const globalForRoleCache = globalThis as unknown as { __sessionRoleCache?: Map<string, CachedRole> };
const sessionRoleCache = globalForRoleCache.__sessionRoleCache ?? new Map<string, CachedRole>();
globalForRoleCache.__sessionRoleCache = sessionRoleCache;

function isPublicPath(pathname: string): boolean {
  const publicRoutes = ["/", "/login", "/register", "/forgot-password", "/reset-password", "/privacidade", "/termos"];
  const isDocsRoute = pathname === "/docs" || pathname.startsWith("/docs/");
  const isReleasesRoute = pathname === "/releases" || pathname.startsWith("/releases/");

  return (
    publicRoutes.includes(pathname) ||
    isDocsRoute ||
    isReleasesRoute ||
    pathname.startsWith("/api/webhooks") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/search") ||
    pathname.startsWith("/api/revalidate")
  );
}

function getSessionToken(request: NextRequest): string | undefined {
  return (
    request.cookies.get("better-auth.session_token")?.value ??
    request.cookies.get("__Secure-better-auth.session_token")?.value
  );
}

function getRoleFromCache(sessionToken: string): AppRole | null {
  const cached = sessionRoleCache.get(sessionToken);
  if (!cached) return null;

  if (Date.now() > cached.expiresAt) {
    sessionRoleCache.delete(sessionToken);
    return null;
  }

  return cached.role;
}

function saveRoleToCache(sessionToken: string, role: AppRole) {
  if (sessionRoleCache.size >= ROLE_CACHE_MAX_ITEMS) {
    const firstKey = sessionRoleCache.keys().next().value;
    if (firstKey) sessionRoleCache.delete(firstKey);
  }

  sessionRoleCache.set(sessionToken, {
    role,
    expiresAt: Date.now() + ROLE_CACHE_TTL_MS,
  });
}

function isAppRole(value: string): value is AppRole {
  return APP_ROLES.includes(value as AppRole);
}

async function getRoleFromCookieCache(request: NextRequest): Promise<AppRole | null> {
  try {
    const payload = (await getCookieCache(request.headers, {
      secret: process.env.BETTER_AUTH_SECRET,
      strategy: "jwt",
      cookiePrefix: "better-auth",
    })) as SessionCachePayload | null;

    const role = payload?.user?.role;
    if (!role) return null;
    return isAppRole(role) ? role : null;
  } catch {
    return null;
  }
}

function redirectTo(request: NextRequest, to: string) {
  const url = request.nextUrl.clone();
  url.pathname = to;
  return NextResponse.redirect(url);
}

function mapAdminPathToAppPath(pathname: string): string {
  return pathname === "/admin" ? "/app" : pathname.replace(/^\/admin/, "/app");
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    const url = request.nextUrl.clone();
    url.pathname = mapAdminPathToAppPath(pathname);
    return NextResponse.redirect(url);
  }

  const sessionToken = getSessionToken(request);
  const isAuthenticated = !!sessionToken;
  const isPublicRoute = isPublicPath(pathname);

  if (!isPublicRoute && !isAuthenticated) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  if (isAuthenticated && (pathname === "/login" || pathname === "/register")) {
    return redirectTo(request, "/");
  }

  if (isAuthenticated && pathname.startsWith("/app/cadastros")) {
    const roleFromCache = sessionToken ? getRoleFromCache(sessionToken) : null;
    const role = roleFromCache ?? (await getRoleFromCookieCache(request));

    if (!role) {
      return NextResponse.next();
    }

    if (!roleFromCache && sessionToken) saveRoleToCache(sessionToken, role);

    if (pathname === "/app/cadastros" && !hasAllowedRole(role, CADASTROS_ROUTE_RULES.empresa.allowed)) {
      return redirectTo(request, CADASTROS_ROUTE_RULES.root.redirectIfBlocked);
    }

    if (pathname.startsWith(CADASTROS_ROUTE_RULES.sistema.pathPrefix) && !hasAllowedRole(role, SYSTEM_ROLES)) {
      return redirectTo(request, CADASTROS_ROUTE_RULES.sistema.redirectIfBlocked);
    }

    if (pathname.startsWith(CADASTROS_ROUTE_RULES.empresa.pathPrefix) && !hasAllowedRole(role, CADASTROS_ROUTE_RULES.empresa.allowed)) {
      return redirectTo(request, CADASTROS_ROUTE_RULES.empresa.redirectIfBlocked);
    }

    if (pathname.startsWith(CADASTROS_ROUTE_RULES.usuarios.pathPrefix) && !hasAllowedRole(role, CADASTROS_ROUTE_RULES.usuarios.allowed)) {
      return redirectTo(request, CADASTROS_ROUTE_RULES.usuarios.redirectIfBlocked);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
