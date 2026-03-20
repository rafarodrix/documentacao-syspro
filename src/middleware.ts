import { NextResponse, type NextRequest } from "next/server";
import { getCookieCache } from "better-auth/cookies";
import { APP_ROLES, CADASTROS_ROUTE_RULES, DOCS_ROUTE_RULES, SYSTEM_ROLES, hasAllowedRole, type AppRole } from "@/core/config/route-access";
import { mapLegacyAdminPathToApp } from "@/core/config/platform-route-aliases";

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
  const isReleasesRoute = pathname === "/releases" || pathname.startsWith("/releases/");

  return (
    publicRoutes.includes(pathname) ||
    isReleasesRoute ||
    pathname.startsWith("/api/webhooks") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/search") ||
    pathname.startsWith("/api/revalidate") ||
    pathname.startsWith("/api/platform/zammad")
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

async function resolveRequestRole(request: NextRequest, sessionToken?: string): Promise<AppRole | null> {
  const roleFromCache = sessionToken ? getRoleFromCache(sessionToken) : null;
  if (roleFromCache) return roleFromCache;

  const roleFromCookie = await getRoleFromCookieCache(request);
  if (roleFromCookie && sessionToken) saveRoleToCache(sessionToken, roleFromCookie);
  return roleFromCookie;
}

function redirectTo(request: NextRequest, to: string) {
  const url = request.nextUrl.clone();
  url.pathname = to;
  return NextResponse.redirect(url);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const mappedAdminPath = mapLegacyAdminPathToApp(pathname);
  if (mappedAdminPath) {
    const url = request.nextUrl.clone();
    url.pathname = mappedAdminPath;
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
    return redirectTo(request, "/app");
  }

  if (
    isAuthenticated &&
    (pathname.startsWith("/app/cadastros") || pathname.startsWith(DOCS_ROUTE_RULES.technical.pathPrefix))
  ) {
    const role = await resolveRequestRole(request, sessionToken);

    if (!role) {
      return NextResponse.next();
    }

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

    if (
      pathname.startsWith(DOCS_ROUTE_RULES.technical.pathPrefix) &&
      !hasAllowedRole(role, DOCS_ROUTE_RULES.technical.allowed)
    ) {
      return redirectTo(request, DOCS_ROUTE_RULES.technical.redirectIfBlocked);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
