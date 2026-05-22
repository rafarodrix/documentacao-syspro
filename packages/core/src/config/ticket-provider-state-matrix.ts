import { TicketModuleStatus, TICKET_MODULE_STATUS_VALUES } from "@dosc-syspro/contracts";

export type TicketStatus = TicketModuleStatus;

type StatusRule = {
  status: TicketStatus;
  keywords: string[];
};

type ParsedStateMatrix = {
  activeWorkflowStateIds: number[];
  statusByStateId: Record<number, TicketStatus>;
  statusRules: StatusRule[];
};

const DEFAULT_MATRIX: ParsedStateMatrix = {
  activeWorkflowStateIds: [2, 6, 7],
  statusByStateId: {
    1: "NEW",
    2: "IN_PROGRESS",
    3: "WAITING_CUSTOMER",
    4: "RESOLVED",
    5: "RESOLVED",
    6: "IN_PROGRESS",
    7: "WAITING_CUSTOMER",
  },
  statusRules: [
    { status: "RESOLVED", keywords: ["closed", "fechado", "resolvido", "merged", "mesclado", "finalizado", "resolved"] },
    { status: "WAITING_CUSTOMER", keywords: ["pendente", "pending", "aguardando", "teste", "testes", "reminder", "waiting_customer"] },
    { status: "IN_PROGRESS", keywords: ["analise", "analysis", "desenvolvimento", "development", "in_progress", "in progress"] },
    { status: "NEW", keywords: ["novo", "new", "open", "aberto"] },
  ],
};

function isTicketStatus(value: unknown): value is TicketStatus {
  return typeof value === "string" && TICKET_MODULE_STATUS_VALUES.includes(value as TicketModuleStatus);
}

function parseStateMatrixFromEnv(): ParsedStateMatrix | null {
  const raw = process.env.TICKET_STATE_MATRIX_JSON;
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<ParsedStateMatrix>;
    const activeWorkflowStateIds = Array.isArray(parsed.activeWorkflowStateIds)
      ? parsed.activeWorkflowStateIds.filter((id): id is number => typeof id === "number")
      : DEFAULT_MATRIX.activeWorkflowStateIds;

    const statusByStateIdEntries = Object.entries(parsed.statusByStateId ?? {}).filter(
      ([key, value]) => Number.isFinite(Number(key)) && isTicketStatus(value)
    );
    const statusByStateId = statusByStateIdEntries.reduce<Record<number, TicketStatus>>((acc, [key, value]) => {
      acc[Number(key)] = value as TicketStatus;
      return acc;
    }, {});

    const statusRules = Array.isArray(parsed.statusRules)
      ? parsed.statusRules
          .filter((rule): rule is StatusRule => isTicketStatus(rule?.status) && Array.isArray(rule?.keywords))
          .map((rule) => ({
            status: rule.status,
            keywords: rule.keywords.filter((w): w is string => typeof w === "string"),
          }))
      : DEFAULT_MATRIX.statusRules;

    return {
      activeWorkflowStateIds: activeWorkflowStateIds.length ? activeWorkflowStateIds : DEFAULT_MATRIX.activeWorkflowStateIds,
      statusByStateId: Object.keys(statusByStateId).length ? statusByStateId : DEFAULT_MATRIX.statusByStateId,
      statusRules: statusRules.length ? statusRules : DEFAULT_MATRIX.statusRules,
    };
  } catch {
    return null;
  }
}

const MATRIX = parseStateMatrixFromEnv() ?? DEFAULT_MATRIX;

export function getTicketProviderStateMatrix(): ParsedStateMatrix {
  return MATRIX;
}
