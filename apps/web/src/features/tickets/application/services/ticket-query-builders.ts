import type { QueueKey, TicketStatusGroup } from "@dosc-syspro/core";
import { TICKET_STATUS_QUERY_TERMS, getStateIdsForStatusGroup } from "@dosc-syspro/core";

export function buildStateIdQuery(stateIds: readonly number[]): string {
  return `(${stateIds.map((id) => `state_id:${id}`).join(" OR ")})`;
}

export function buildStatusTermsQuery(statusGroup: TicketStatusGroup): string {
  const terms = TICKET_STATUS_QUERY_TERMS[statusGroup] ?? [];
  if (!terms.length) return "";

  return `(${terms.map((term) => `state:"${escapeSearchTerm(term)}"`).join(" OR ")})`;
}

export function buildEmailScopeQuery(emails: string[]): string {
  const normalized = Array.from(new Set(emails.map((email) => email.trim().toLowerCase()).filter(Boolean)));
  if (!normalized.length) return "";
  return `(${normalized.map((email) => `customer.email:${email}`).join(" OR ")})`;
}

export function buildQueueQuery(queue: QueueKey, zammadUserId?: number | null): string {
  if (queue === "critical") return "priority_id:3";
  if (queue === "unassigned") return "owner_id:null";
  if (queue === "no_response") return "first_response_at:null";
  if (queue === "my_queue") return zammadUserId ? `owner_id:${zammadUserId}` : "id:-1";
  return "";
}

export function escapeSearchTerm(term: string): string {
  return term.replace(/["\\]/g, "").trim();
}

export function buildSearchQuery(search?: string, includeCustomer = false): string {
  const term = escapeSearchTerm(search || "");
  if (!term) return "";

  const parts = [
    `number:${term}`,
    `title:${term}`,
    `"${term}"`,
  ];

  if (includeCustomer) {
    parts.push(`customer:${term}`);
  }

  return `(${parts.join(" OR ")})`;
}

export function combineQueryParts(...parts: Array<string | null | undefined>): string {
  return parts.filter(Boolean).map((part) => `(${part})`).join(" AND ");
}

export function buildStatusQuery(statusGroup?: TicketStatusGroup | "all"): string {
  if (!statusGroup || statusGroup === "all") return "";
  const stateIds = getStateIdsForStatusGroup(statusGroup);
  const parts = [
    stateIds.length ? buildStateIdQuery(stateIds) : "",
    buildStatusTermsQuery(statusGroup),
  ].filter(Boolean);

  if (!parts.length) return "id:-1";
  if (parts.length === 1) return parts[0];
  return `(${parts.join(" OR ")})`;
}

export function buildTrackedStatusQuery(): string {
  const parts = [buildStatusQuery("open"), buildStatusQuery("pending"), buildStatusQuery("closed")].filter(Boolean);
  if (!parts.length) return "";
  if (parts.length === 1) return parts[0];
  return `(${parts.join(" OR ")})`;
}
