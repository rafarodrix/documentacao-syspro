import type { Role } from "@prisma/client";
import { getDocScopeFromSlug, canRoleAccessDocsScope } from "@/lib/docs-scope";

const ADMIN_ONLY_DOC_SLUGS = new Set(["documentacao-docs-interna"]);

function getRelativeSlug(url: string) {
  return url.replace(/^\/(?:portal\/)?docs\/?/, "").split("/").filter(Boolean);
}

export function isAdminOnlyDocUrl(url: string): boolean {
  const slug = url.replace(/^\/(?:portal\/)?docs\/?/, "").split("/").filter(Boolean);
  const normalized = getDocScopeFromSlug(slug) ? slug.slice(1) : slug;
  return normalized.some((segment) => ADMIN_ONLY_DOC_SLUGS.has(segment));
}

export async function canUserAccessDocUrl({
  url,
  role,
}: {
  url: string;
  userId: string;
  role?: Role;
}): Promise<boolean> {
  const relativeSlug = getRelativeSlug(url);

  if (role) {
    const scope = getDocScopeFromSlug(relativeSlug);
    if (scope && !canRoleAccessDocsScope(role, scope)) {
      return false;
    }
  }

  return true;
}
