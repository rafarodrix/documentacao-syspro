import { NextResponse, type NextRequest } from "next/server";
import { getCookieCache } from "better-auth/cookies";
import { APP_ROLES, type AppRole } from "@dosc-syspro/core";

const LEGACY_DOCS_REDIRECTS: Record<string, string> = {
  "/docs/suporte": "/portal/docs/suporte",
  "/docs/manuais-tecnicos": "/portal/docs/suporte",
  "/docs/treinamento/steps-comercial": "/portal/docs/cliente/primeiros-passos/steps-comercial",
  "/docs/treinamento/steps-auto-center": "/portal/docs/cliente/primeiros-passos/steps-auto-center",
};

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

  return (
    publicRoutes.includes(pathname) ||
    pathname.startsWith("/chatwoot/app") ||
    pathname.startsWith("/api/webhooks") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/search") ||
    pathname.startsWith("/api/revalidate") ||
    pathname.startsWith("/api/remote/agents") ||
    // Remote agent endpoints: these requests come from machine/service accounts
    // without browser session cookies, so they must bypass portal auth middleware.
    pathname.startsWith("/api/remote/rustdesk") ||
    pathname.startsWith("/api/remote/heartbeat")
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
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) return null;

  try {
    const payload = (await getCookieCache(request.headers, {
      secret,
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
  const legacyDocsRedirect = LEGACY_DOCS_REDIRECTS[pathname];

  if (legacyDocsRedirect) {
    const url = request.nextUrl.clone();
    url.pathname = legacyDocsRedirect;
    return NextResponse.redirect(url, 307);
  }

  const sessionToken = getSessionToken(request);
  const isAuthenticated = !!sessionToken;
  const isPublicRoute = isPublicPath(pathname);
  const resolvedRole = isAuthenticated ? await resolveRequestRole(request, sessionToken) : null;
  if (!isPublicRoute && !isAuthenticated) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  if (resolvedRole && (pathname === "/login" || pathname === "/register")) {
    return redirectTo(request, "/portal");
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
