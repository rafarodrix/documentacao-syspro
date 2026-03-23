import { CompanySegment, Role } from "@prisma/client";
import { SYSTEM_ROLES } from "@dosc-syspro/core";

export const DOCS_TECHNICAL_PATH_PREFIX = "/docs/manuais-tecnicos";
export const DOCS_TECHNICAL_ROLES: Role[] = SYSTEM_ROLES;
export const DOCS_ADMIN_ONLY_SLUGS = new Set<string>([
  "suporte/documentacao-docs-interna",
]);

// Mapa de segmentacao por slug relativo em /docs.
// Se nao houver entrada para o slug, o acesso fica liberado para todos.
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
  const relativeSlug = url.replace(/^\/docs\/?/, "").split("/").filter(Boolean);
  return isAdminOnlyDocSlug(relativeSlug);
}
