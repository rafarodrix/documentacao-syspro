import type { TicketStatus } from "../entities/ticket";

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
    1: "Aberto",
    2: "Em Análise",
    3: "Pendente",
    4: "Resolvido",
    5: "Resolvido",
    6: "Em Análise",
    7: "Pendente",
  },
  statusRules: [
    { status: "Resolvido", keywords: ["closed", "fechado", "resolvido", "merged", "mesclado", "finalizado"] },
    { status: "Pendente", keywords: ["pendente", "pending", "aguardando", "teste", "testes", "reminder"] },
    { status: "Em Análise", keywords: ["analise", "analysis", "desenvolvimento", "development"] },
    { status: "Aberto", keywords: ["novo", "new", "open", "aberto"] },
  ],
};

function isTicketStatus(value: unknown): value is TicketStatus {
  return value === "Aberto" || value === "Em Analise" || value === "Pendente" || value === "Resolvido";
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

export function getZammadStateMatrix(): ParsedStateMatrix {
  return MATRIX;
}
