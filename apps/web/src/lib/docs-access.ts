import { CompanySegment } from "@prisma/client";
import type { UserRole } from "@/lib/auth-helpers";
import { canAccessByCompanySegment } from "@/features/company/application/company-segment-access";

export const DOCS_TECHNICAL_PATH_PREFIX = "/portal/docs/manuais-tecnicos";
const DOCS_PATH_PREFIX_PATTERN = /^\/(?:portal\/)?docs\/?/;
export const DOCS_ADMIN_ONLY_SLUGS = new Set<string>([
  "suporte/documentacao-docs-interna",
]);

const DOCS_SEGMENT_RULES: Record<string, CompanySegment[]> = {
  "treinamento/steps-auto-center": [CompanySegment.AUTO_PECAS],
  "treinamento/steps-comercial": [CompanySegment.COMERCIAL],
};

export function isTechnicalManualSlug(slug?: string[]): boolean {
  return slug?.[0] === "manuais-tecnicos";
}

export function getRequiredSegmentsForDocSlug(slug?: string[]): CompanySegment[] {
  if (!slug?.length) return [];
  const key = slug.join("/");
  return DOCS_SEGMENT_RULES[key] ?? [];
}

export function isAdminOnlyDocSlug(slug?: string[]): boolean {
  if (!slug?.length) return false;
  return DOCS_ADMIN_ONLY_SLUGS.has(slug.join("/"));
}

export function isAdminOnlyDocUrl(url: string): boolean {
  const relativeSlug = url.replace(DOCS_PATH_PREFIX_PATTERN, "").split("/").filter(Boolean);
  return isAdminOnlyDocSlug(relativeSlug);
}

export async function canUserAccessDocUrl({
  url,
  role,
  userId,
  canViewTechnical,
}: {
  url: string;
  role: UserRole;
  userId: string;
  canViewTechnical: boolean;
}): Promise<boolean> {
  if (!canViewTechnical && url.startsWith(DOCS_TECHNICAL_PATH_PREFIX)) {
    return false;
  }

  if (role === "CLIENTE_ADMIN" || role === "CLIENTE_USER") {
    const relativeSlug = url.replace(DOCS_PATH_PREFIX_PATTERN, "").split("/").filter(Boolean);
    const requiredSegments = getRequiredSegmentsForDocSlug(relativeSlug);
    if (requiredSegments.length === 0) return true;
    return canAccessByCompanySegment(userId, requiredSegments);
  }

  return true;
}
