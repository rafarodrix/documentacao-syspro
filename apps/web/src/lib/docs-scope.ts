import type { Role } from "@prisma/client";

export const DOCS_BASE_PATH = "/portal/docs";

export const DOCS_SCOPE_ROUTES = {
  cliente: `${DOCS_BASE_PATH}/cliente`,
  suporte: `${DOCS_BASE_PATH}/suporte`,
  admin: `${DOCS_BASE_PATH}/admin`,
} as const;

export type DocsScope = keyof typeof DOCS_SCOPE_ROUTES;

const INTERNAL_SUPPORT_ROLES = new Set<Role>(["ADMIN", "DEVELOPER", "SUPORTE"]);

export function isDocsScope(value: string): value is DocsScope {
  return value === "cliente" || value === "suporte" || value === "admin";
}

export function getDocScopeFromSlug(slug?: string[]): DocsScope | null {
  const firstSegment = slug?.[0];
  return firstSegment && isDocsScope(firstSegment) ? firstSegment : null;
}

export function getDocScopeFromUrl(url: string): DocsScope | null {
  const slug = url.replace(/^\/(?:portal\/)?docs\/?/, "").split("/").filter(Boolean);
  return getDocScopeFromSlug(slug);
}

export function canRoleAccessDocsScope(role: Role, scope: DocsScope): boolean {
  if (scope === "cliente") return true;
  if (scope === "suporte") return INTERNAL_SUPPORT_ROLES.has(role);
  return role === "ADMIN";
}

export function canRoleAccessDocsUrl(role: Role, url: string): boolean {
  const scope = getDocScopeFromUrl(url);
  if (!scope) return true;
  return canRoleAccessDocsScope(role, scope);
}

export function getDefaultDocsRouteForRole(_role: Role): string {
  return DOCS_SCOPE_ROUTES.cliente;
}
