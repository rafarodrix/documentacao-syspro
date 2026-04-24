import type { Release } from "../entities/release.entity";

export type ReleaseKind = "BUG" | "MELHORIA" | "NOVA_FUNCIONALIDADE";

export type ReleaseProjectionSource = {
  id: string;
  ticketNumber?: string | null;
  subject?: string | null;
  resolutionSummary?: string | null;
  resolutionVideoUrl?: string | null;
  releaseType?: string | null;
  releaseModule?: string | null;
  publishToReleases?: boolean | null;
  metadata?: unknown;
  closedAt?: Date | string | null;
  updatedAt: Date | string;
};

export function readReleaseMetadataString(metadata: unknown, key: string): string | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const value = (metadata as Record<string, unknown>)[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function normalizeReleaseType(value: unknown): ReleaseKind | null {
  const normalized = typeof value === "string" ? value.trim().toUpperCase() : "";
  if (normalized === "BUG" || normalized === "MELHORIA" || normalized === "NOVA_FUNCIONALIDADE") return normalized;
  return null;
}

export function inferReleaseTypeFromCategory(category: unknown): ReleaseKind {
  const normalized = typeof category === "string" ? category.trim().toLowerCase() : "";
  if (normalized.includes("new-feature") || normalized.includes("nova funcionalidade") || normalized.includes("feature")) return "NOVA_FUNCIONALIDADE";
  if (normalized.includes("bug") || normalized.includes("incident") || normalized.includes("erro")) return "BUG";
  return "MELHORIA";
}

export function inferReleaseTypeFromMetadata(metadata: unknown): ReleaseKind {
  return normalizeReleaseType(readReleaseMetadataString(metadata, "categoryType")) || inferReleaseTypeFromCategory(readReleaseMetadataString(metadata, "category"));
}

export function buildReleaseFromTicket(ticket: ReleaseProjectionSource): Release | null {
  if (ticket.publishToReleases !== true) return null;

  const summary = ticket.resolutionSummary?.trim();
  if (!summary) return null;

  const releaseType = normalizeReleaseType(ticket.releaseType) || inferReleaseTypeFromMetadata(ticket.metadata);
  const date = ticket.closedAt || ticket.updatedAt;
  const isoDate = date instanceof Date ? date.toISOString() : new Date(date).toISOString();

  return {
    id: ticket.ticketNumber || ticket.id,
    type: releaseType === "BUG" ? "Bug" : "Melhoria",
    isoDate: isoDate.slice(0, 10),
    title: readReleaseMetadataString(ticket.metadata, "releaseTitle") || ticket.subject || "Atualizacao sem titulo",
    summary,
    link: `/portal/tickets/${ticket.id}`,
    videoLink: ticket.resolutionVideoUrl || null,
    tags: [ticket.releaseModule || readReleaseMetadataString(ticket.metadata, "module")].filter(
      (tag): tag is string => Boolean(tag),
    ),
  };
}
