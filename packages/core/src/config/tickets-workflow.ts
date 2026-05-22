import { getTicketStateMatrix } from "./ticket-state-matrix";

export type QueueKey = "all" | "my_queue" | "unassigned" | "critical" | "no_response";
export type TicketStatusGroup = "open" | "development" | "testing" | "closed";

export const TICKET_QUEUE_KEYS: QueueKey[] = ["all", "my_queue", "unassigned", "critical", "no_response"];
export const TICKET_STATUS_GROUPS: TicketStatusGroup[] = ["open", "development", "testing", "closed"];

const matrix = getTicketStateMatrix();

function uniqueSorted(values: number[]): number[] {
  return Array.from(new Set(values)).sort((a, b) => a - b);
}

function normalizeLoose(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function matchesBucket(value: string, bucket: TicketStatusGroup): boolean {
  const normalized = normalizeLoose(value);
  if (bucket === "open") return normalized.includes("aberto") || normalized.includes("novo") || normalized.includes("open") || normalized.includes("new");
  if (bucket === "development") {
    return (
      normalized.includes("desenvolv") ||
      normalized.includes("in_progress") ||
      normalized.includes("in progress") ||
      normalized.includes("andamento")
    );
  }
  if (bucket === "closed") {
    return (
      normalized.includes("resolvido") ||
      normalized.includes("fechado") ||
      normalized.includes("closed") ||
      normalized.includes("finalizado") ||
      normalized.includes("resolved") ||
      normalized.includes("archived")
    );
  }
  return (
    normalized.includes("anal") ||
    normalized.includes("triag") ||
    normalized.includes("pend") ||
    normalized.includes("aguard") ||
    normalized.includes("test") ||
    normalized.includes("waiting") ||
    normalized.includes("waiting_customer")
  );
}

function getStateIdsByBucket(bucket: TicketStatusGroup): number[] {
  return uniqueSorted(
    Object.entries(matrix.statusByStateId)
      .filter(([, status]) => matchesBucket(String(status), bucket))
      .map(([stateId]) => Number(stateId))
      .filter((stateId) => Number.isFinite(stateId))
  );
}

export const OPEN_STATE_IDS = uniqueSorted(getStateIdsByBucket("open")) as number[];
export const DEVELOPMENT_STATE_IDS = uniqueSorted(getStateIdsByBucket("development")) as number[];
export const TESTING_STATE_IDS = uniqueSorted(getStateIdsByBucket("testing")) as number[];
export const CLOSED_STATE_IDS = uniqueSorted(getStateIdsByBucket("closed")) as number[];
export const OPERATIONAL_STATE_IDS = uniqueSorted([...OPEN_STATE_IDS, ...DEVELOPMENT_STATE_IDS, ...TESTING_STATE_IDS]) as number[];

export const TICKET_STATUS_QUERY_TERMS: Record<TicketStatusGroup, string[]> = {
  open: ["1. novo", "novo", "new", "aberto", "open"],
  development: ["3. em desenvolvimento", "desenvolvimento", "in_progress", "in progress", "em andamento"],
  testing: ["2. em analise", "triagem", "triage", "4. em testes", "5. aguardando validacao cliente", "analise", "teste", "testes", "aguardando validacao", "pending", "pendente", "reminder"],
  closed: ["7. finalizado", "finalizado", "resolvido", "fechado", "closed", "merged"],
};

export function getTicketStatusGroup(status: string): TicketStatusGroup {
  const normalized = normalizeLoose(status || "");
  if (TICKET_STATUS_QUERY_TERMS.open.some((keyword) => normalized.includes(normalizeLoose(keyword)))) return "open";
  if (TICKET_STATUS_QUERY_TERMS.closed.some((keyword) => normalized.includes(normalizeLoose(keyword)))) return "closed";
  if (TICKET_STATUS_QUERY_TERMS.development.some((keyword) => normalized.includes(normalizeLoose(keyword)))) return "development";
  return "testing";
}

export function isTicketStatusGroup(value: string): value is TicketStatusGroup {
  return TICKET_STATUS_GROUPS.includes(value as TicketStatusGroup);
}

export function getStateIdsForStatusGroup(group: TicketStatusGroup): readonly number[] {
  if (group === "open") return OPEN_STATE_IDS;
  if (group === "development") return DEVELOPMENT_STATE_IDS;
  if (group === "closed") return CLOSED_STATE_IDS;
  return TESTING_STATE_IDS;
}
