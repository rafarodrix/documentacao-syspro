import type { CrmLead, CrmLeadStage } from "@dosc-syspro/contracts/crm";
import { CRM_STAGE_LABELS, getLeadAttentionState, DUE_SOON_DAYS, STALE_LEAD_DAYS } from "@/features/crm/domain/crm.types";
import { PIPELINE_COLUMNS } from "./lead-management.constants";
import type { LeadAttentionFilter } from "./lead-management.types";

export { getLeadAttentionState, DUE_SOON_DAYS, STALE_LEAD_DAYS };

export function getPipelineStageLabel(stage: CrmLeadStage) {
  if (stage === "MQL" || stage === "SQL") return "Validacao";
  return CRM_STAGE_LABELS[stage];
}

export function normalizeStageForSelect(stage: CrmLeadStage) {
  return stage === "MQL" ? "SQL" : stage;
}

export function resolveLeadContactName(lead: CrmLead) {
  const contacts = lead.contacts || [];
  const primaryManualContact = contacts.find((c) => c.isPrimary)?.name?.trim();
  const firstManualContact = contacts.find((c) => c.name?.trim())?.name?.trim();
  return lead.primaryContactName || primaryManualContact || firstManualContact || "Sem contato vinculado";
}

export function matchesAttentionFilter(lead: CrmLead, filter: LeadAttentionFilter) {
  const state = getLeadAttentionState(lead);
  if (filter === "OVERDUE") return state.isOverdue;
  if (filter === "NO_NEXT_STEP") return !state.hasNextStep && !state.isClosed;
  if (filter === "DUE_SOON") return state.isDueSoon;
  return true;
}

export function sortLeadsForBoard(leads: CrmLead[]) {
  return [...leads].sort((a, b) => {
    const aA = getLeadAttentionState(a);
    const bA = getLeadAttentionState(b);
    const aScore = Number(aA.isOverdue) * 4 + Number(!aA.hasNextStep) * 3 + Number(aA.isDueSoon) * 2 + Number(aA.isStale);
    const bScore = Number(bA.isOverdue) * 4 + Number(!bA.hasNextStep) * 3 + Number(bA.isDueSoon) * 2 + Number(bA.isStale);
    if (aScore !== bScore) return bScore - aScore;
    const aDate = a.expectedCloseAt ? new Date(a.expectedCloseAt).getTime() : Number.MAX_SAFE_INTEGER;
    const bDate = b.expectedCloseAt ? new Date(b.expectedCloseAt).getTime() : Number.MAX_SAFE_INTEGER;
    if (aDate !== bDate) return aDate - bDate;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
}

export function groupLeadsByStageLocal(leads: CrmLead[]) {
  return {
    LEAD: leads.filter((l) => l.stage === "LEAD"),
    MQL: leads.filter((l) => l.stage === "MQL"),
    SQL: leads.filter((l) => l.stage === "SQL"),
    PROPOSAL: leads.filter((l) => l.stage === "PROPOSAL"),
    NEGOTIATION: leads.filter((l) => l.stage === "NEGOTIATION"),
    WON: leads.filter((l) => l.stage === "WON"),
    LOST: leads.filter((l) => l.stage === "LOST"),
  };
}

export function unwrapCollectionResponse<T>(response: unknown): T[] {
  if (Array.isArray(response)) return response;
  if (
    response &&
    typeof response === "object" &&
    "data" in response &&
    Array.isArray((response as { data?: unknown }).data)
  ) {
    return (response as { data: T[] }).data;
  }
  return [];
}

export function getPipelineColumnLeads(
  grouped: ReturnType<typeof groupLeadsByStageLocal>,
  column: (typeof PIPELINE_COLUMNS)[number],
) {
  return column.stages.flatMap((stage) => grouped[stage]);
}
