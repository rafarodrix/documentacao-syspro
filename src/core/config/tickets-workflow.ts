import { getZammadStateMatrix } from "@/core/config/zammad-state-matrix";

export type QueueKey = "all" | "my_queue" | "unassigned" | "critical" | "no_response";

export type TicketStatusGroup = "open" | "pending" | "closed";

export const TICKET_QUEUE_KEYS: QueueKey[] = ["all", "my_queue", "unassigned", "critical", "no_response"];
export const TICKET_STATUS_GROUPS: TicketStatusGroup[] = ["open", "pending", "closed"];

const matrix = getZammadStateMatrix();

function uniqueSorted(values: number[]): number[] {
  return Array.from(new Set(values)).sort((a, b) => a - b);
}

function normalizeLoose(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/Ã¡/gi, "a")
    .replace(/Ã©/gi, "e")
    .replace(/Ã­/gi, "i")
    .replace(/Ã³/gi, "o")
    .replace(/Ãº/gi, "u")
    .replace(/Ã£/gi, "a")
    .replace(/Ãµ/gi, "o")
    .toLowerCase();
}

function matchesBucket(value: string, bucket: TicketStatusGroup): boolean {
  const normalized = normalizeLoose(value);
  if (bucket === "open") return normalized.includes("aberto") || normalized.includes("novo") || normalized.includes("open") || normalized.includes("new");
  if (bucket === "closed") return normalized.includes("resolvido") || normalized.includes("fechado") || normalized.includes("closed") || normalized.includes("finalizado");
  return (
    normalized.includes("anal") ||
    normalized.includes("desenvolv") ||
    normalized.includes("pend") ||
    normalized.includes("aguard") ||
    normalized.includes("test")
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
export const PENDING_STATE_IDS = uniqueSorted(getStateIdsByBucket("pending")) as number[];
export const CLOSED_STATE_IDS = uniqueSorted(getStateIdsByBucket("closed")) as number[];
export const OPERATIONAL_STATE_IDS = uniqueSorted([
  ...OPEN_STATE_IDS,
  ...PENDING_STATE_IDS,
  ...CLOSED_STATE_IDS,
]) as number[];

const STATUS_GROUP_KEYWORDS: Record<TicketStatusGroup, string[]> = {
  open: ["1. novo", "novo", "new", "aberto", "open"],
  pending: [
    "2. em analise",
    "3. em desenvolvimento",
    "4. em testes",
    "5. aguardando validacao cliente",
    "analise",
    "desenvolvimento",
    "teste",
    "testes",
    "aguardando validacao",
    "pending",
    "pendente",
    "reminder",
  ],
  closed: ["7. finalizado", "finalizado", "resolvido", "fechado", "closed", "merged"],
};

export function getTicketStatusGroup(status: string): TicketStatusGroup {
  const normalized = (status || "").toLowerCase();
  if (STATUS_GROUP_KEYWORDS.open.some((keyword) => normalized.includes(keyword))) return "open";
  if (STATUS_GROUP_KEYWORDS.closed.some((keyword) => normalized.includes(keyword))) return "closed";
  return "pending";
}

export function isTicketStatusGroup(value: string): value is TicketStatusGroup {
  return TICKET_STATUS_GROUPS.includes(value as TicketStatusGroup);
}

export function getStateIdsForStatusGroup(group: TicketStatusGroup): readonly number[] {
  if (group === "open") return OPEN_STATE_IDS;
  if (group === "closed") return CLOSED_STATE_IDS;
  return PENDING_STATE_IDS;
}
