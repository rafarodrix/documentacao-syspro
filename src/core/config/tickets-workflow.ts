export type QueueKey = "all" | "my_queue" | "unassigned" | "critical" | "no_response";

export type TicketStatusGroup = "open" | "pending" | "closed";

export const TICKET_QUEUE_KEYS: QueueKey[] = ["all", "my_queue", "unassigned", "critical", "no_response"];
export const TICKET_STATUS_GROUPS: TicketStatusGroup[] = ["open", "pending", "closed"];

export const OPERATIONAL_STATE_IDS = [1, 2, 3, 4, 5, 7] as const;

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
