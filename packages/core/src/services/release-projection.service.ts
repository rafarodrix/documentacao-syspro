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
  const normalized =
    typeof value === "string"
      ? value
          .trim()
          .toUpperCase()
          .replace(/\s+/g, "_")
          .replace(/-/g, "_")
      : "";
  if (normalized === "BUG" || normalized === "MELHORIA" || normalized === "NOVA_FUNCIONALIDADE") return normalized;
  if (normalized === "FEATURE" || normalized === "NEW_FEATURE" || normalized === "NOVA_FUNCIONALIDADES") {
    return "NOVA_FUNCIONALIDADE";
  }
  return null;
}

export function inferReleaseTypeFromCategory(category: unknown): ReleaseKind | null {
  return normalizeReleaseType(category);
}

export function inferReleaseTypeFromMetadata(metadata: unknown): ReleaseKind | null {
  return normalizeReleaseType(readReleaseMetadataString(metadata, "categoryType"));
}

export function buildReleaseFromTicket(ticket: ReleaseProjectionSource): Release | null {
  if (ticket.publishToReleases !== true) return null;

  const summary = ticket.resolutionSummary?.trim();
  if (!summary) return null;

  const releaseType =
    normalizeReleaseType(ticket.releaseType) ||
    inferReleaseTypeFromMetadata(ticket.metadata) ||
    "MELHORIA";
  const date = ticket.closedAt || ticket.updatedAt;
  const isoDate = date instanceof Date ? date.toISOString() : new Date(date).toISOString();

  return {
    id: ticket.ticketNumber || ticket.id,
    type: releaseType === "BUG" ? "Bug" : releaseType === "NOVA_FUNCIONALIDADE" ? "Nova Funcionalidade" : "Melhoria",
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
