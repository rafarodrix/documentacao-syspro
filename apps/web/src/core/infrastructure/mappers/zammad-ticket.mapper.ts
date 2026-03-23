import { TicketPriority, TicketStatus } from "@/core/domain/entities/ticket.entity";
import { getZammadStateMatrix } from "@dosc-syspro/core";

const matrix = getZammadStateMatrix();
const ACTIVE_WORKFLOW_STATE_IDS = new Set(matrix.activeWorkflowStateIds);

function normalizeStateName(value?: string | null): string {
  if (!value) return "";
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

export function mapTicketStatusFromStateName(stateName: string): TicketStatus {
  const normalized = normalizeStateName(stateName);

  for (const rule of matrix.statusRules) {
    if (rule.keywords.some((word) => normalized.includes(normalizeStateName(word)))) {
      return rule.status;
    }
  }

  return "Em AnÃ¡lise";
}

export function mapTicketStatusFromStateId(stateId: number): TicketStatus {
  return matrix.statusByStateId[stateId] ?? "Resolvido";
}

export function mapTicketPriority(priorityId: number, name?: string): TicketPriority {
  const lower = name?.toLowerCase() || "";
  if (priorityId === 3) return "Alta";
  if (lower.includes("high") || lower.includes("alta")) return "Alta";
  if (lower.includes("low") || lower.includes("baixa")) return "Baixa";
  if (priorityId === 1) return "Baixa";
  return "MÃ©dia";
}

export function mapTicketStateLabel(rawState: string): string {
  const map: Record<string, string> = {
    new: "Novo",
    open: "Aberto",
    pending_reminder: "Pendente",
    pending_close: "Pendente",
    closed: "Resolvido",
    merged: "Mesclado",
    removed: "Removido",
  };

  return map[rawState] || rawState;
}

export function isAnalysisOrDevelopmentStateId(stateId?: number | null): boolean {
  return typeof stateId === "number" && ACTIVE_WORKFLOW_STATE_IDS.has(stateId);
}

export function isAnalysisOrDevelopmentStateName(stateName?: string | null): boolean {
  const normalized = normalizeStateName(stateName);
  if (!normalized) return false;
  return matrix.statusRules
    .filter((rule) => rule.status === "Em AnÃ¡lise")
    .some((rule) => rule.keywords.some((word) => normalized.includes(normalizeStateName(word))));
}

