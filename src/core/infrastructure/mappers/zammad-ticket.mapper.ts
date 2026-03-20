import { TicketPriority, TicketStatus } from "@/core/domain/entities/ticket.entity";

const ACTIVE_WORKFLOW_STATE_IDS = new Set([2, 3]);
const ACTIVE_WORKFLOW_KEYWORDS = ["analise", "análise", "desenvolvimento", "development"];
const RESOLVED_STATE_KEYWORDS = ["closed", "fechado", "resolvido", "merged", "mesclado"];
const PENDING_STATE_KEYWORDS = ["pendente", "pending", "aguardando", "teste", "testes", "reminder"];
const OPEN_STATE_KEYWORDS = ["novo", "new", "open", "aberto"];

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

  if (RESOLVED_STATE_KEYWORDS.some((word) => normalized.includes(word))) return "Resolvido";
  if (PENDING_STATE_KEYWORDS.some((word) => normalized.includes(word))) return "Pendente";
  if (ACTIVE_WORKFLOW_KEYWORDS.some((word) => normalized.includes(word))) return "Em Análise";
  if (OPEN_STATE_KEYWORDS.some((word) => normalized.includes(word))) return "Aberto";

  // fallback conservador para evitar sumir tickets do dashboard por variação de nomenclatura
  return "Em Análise";
}

export function mapTicketStatusFromStateId(stateId: number): TicketStatus {
  if (stateId === 1) return "Aberto";
  if (stateId === 2 || stateId === 3) return "Em Análise";
  if (stateId === 4 || stateId === 5) return "Pendente";
  return "Resolvido";
}

export function mapTicketPriority(priorityId: number, name?: string): TicketPriority {
  const lower = name?.toLowerCase() || "";
  if (priorityId === 3) return "Alta";
  if (lower.includes("high") || lower.includes("alta")) return "Alta";
  if (lower.includes("low") || lower.includes("baixa")) return "Baixa";
  if (priorityId === 1) return "Baixa";
  return "Média";
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
  return ACTIVE_WORKFLOW_KEYWORDS.some((word) => normalized.includes(word));
}
