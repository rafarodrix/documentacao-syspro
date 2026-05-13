import type { Role } from "@prisma/client";
import { CompanySegment } from "@prisma/client";
import { canAccessByCompanySegment } from "@/features/company/application/company-segment-access";
import { getDocScopeFromSlug, canRoleAccessDocsScope } from "@/lib/docs-scope";

const DOCS_SEGMENT_RULES: Record<string, CompanySegment[]> = {
  "treinamento/steps-auto-center": [CompanySegment.AUTO_PECAS],
  "treinamento/steps-comercial": [CompanySegment.COMERCIAL],
};

const LEGACY_CLIENT_ROOTS = new Set(["manual", "duvidas", "treinamento"]);

const ADMIN_ONLY_DOC_SLUGS = new Set(["documentacao-docs-interna"]);

function getRelativeSlug(url: string) {
  return url.replace(/^\/(?:portal\/)?docs\/?/, "").split("/").filter(Boolean);
}

function normalizeSlugForSegmentRules(slug?: string[]): string[] {
  if (!slug?.length) return [];

  const scope = getDocScopeFromSlug(slug);
  if (scope) {
    return slug.slice(1);
  }

  return slug;
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

export function getRequiredSegmentsForDocSlug(slug?: string[]): CompanySegment[] {
  const normalizedSlug = normalizeSlugForSegmentRules(slug);
  if (normalizedSlug.length === 0) return [];

  return DOCS_SEGMENT_RULES[normalizedSlug.join("/")] ?? [];
}

export async function canUserAccessDocUrl({
  url,
  userId,
  role,
  canViewTechnical,
  canBypassSegmentAccess,
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

  if (!isClientScopedSlug(relativeSlug)) {
    return true;
  }

  if (canBypassSegmentAccess) {
    return true;
  }

  const requiredSegments = getRequiredSegmentsForDocSlug(relativeSlug);
  if (requiredSegments.length === 0) return true;

  return canAccessByCompanySegment(userId, requiredSegments);
}
