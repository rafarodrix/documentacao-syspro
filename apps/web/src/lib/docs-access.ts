import type { Role } from "@prisma/client";
import { getDocScopeFromSlug, canRoleAccessDocsScope } from "@/lib/docs-scope";

const LEGACY_CLIENT_ROOTS = new Set(["manual", "duvidas", "treinamento"]);

const ADMIN_ONLY_DOC_SLUGS = new Set(["documentacao-docs-interna"]);

function getRelativeSlug(url: string) {
  return url.replace(/^\/(?:portal\/)?docs\/?/, "").split("/").filter(Boolean);
}

function isClientScopedSlug(slug?: string[]): boolean {
  if (!slug?.length) return false;

  const scope = getDocScopeFromSlug(slug);
  if (scope) return scope === "cliente";

  return LEGACY_CLIENT_ROOTS.has(slug[0] ?? "");
}

export function isTechnicalManualSlug(slug?: string[]): boolean {
  return slug?.[0] === "manuais-tecnicos";
}

export function isAdminOnlyDocUrl(url: string): boolean {
  const slug = url.replace(/^\/(?:portal\/)?docs\/?/, "").split("/").filter(Boolean);
  const normalized = getDocScopeFromSlug(slug) ? slug.slice(1) : slug;
  return normalized.some((segment) => ADMIN_ONLY_DOC_SLUGS.has(segment));
}

export async function canUserAccessDocUrl({
  url,
  role,
  canViewTechnical,
}: {
  url: string;
  userId: string;
  role?: Role;
  canViewTechnical?: boolean;
  canBypassSegmentAccess?: boolean;
}): Promise<boolean> {
  const relativeSlug = getRelativeSlug(url);

  if (isTechnicalManualSlug(relativeSlug) && canViewTechnical === false) {
    return false;
  }

  if (role) {
    const scope = getDocScopeFromSlug(relativeSlug);
    if (scope && !canRoleAccessDocsScope(role, scope)) {
      return false;
    }
  }

  return true;
}
