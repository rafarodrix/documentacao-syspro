import type { CrmLead, CrmLeadSource, CrmLeadStage } from "@dosc-syspro/contracts/crm";
import type { PaginationMeta } from "@dosc-syspro/contracts";

export type LeadDashboardData = {
  leads: CrmLead[];
  pagination: PaginationMeta | null;
};

export const CRM_ACTIVE_STAGE_ORDER: CrmLeadStage[] = ["LEAD", "MQL", "SQL", "PROPOSAL", "NEGOTIATION"];
export const CRM_CLOSED_STAGE_ORDER: CrmLeadStage[] = ["WON", "LOST"];
export const CRM_STAGE_ORDER: CrmLeadStage[] = [...CRM_ACTIVE_STAGE_ORDER, ...CRM_CLOSED_STAGE_ORDER];

export const CRM_STAGE_LABELS: Record<CrmLeadStage, string> = {
  LEAD: "Lead",
  MQL: "MQL",
  SQL: "SQL",
  PROPOSAL: "Proposta",
  NEGOTIATION: "Negociacao",
  WON: "Ganho",
  LOST: "Perdido",
};

export const CRM_STAGE_DESCRIPTIONS: Record<CrmLeadStage, string> = {
  LEAD: "Entrada inicial e primeiros sinais de interesse.",
  MQL: "Lead qualificado com contexto minimo para avancar.",
  SQL: "O comercial validou aderencia e potencial real.",
  PROPOSAL: "Proposta, demo ou desenho comercial em apresentacao.",
  NEGOTIATION: "Ajustes finais de escopo, prazo, valor ou aprovacao.",
  WON: "Negocio fechado e convertido em cliente.",
  LOST: "Oportunidade encerrada sem conversao.",
};

export const CRM_SOURCE_LABELS: Record<CrmLeadSource, string> = {
  MANUAL: "Manual",
  WHATSAPP: "WhatsApp",
  REFERRAL: "Indicacao",
  FORM: "Formulario",
  EVENT: "Evento",
  OUTBOUND: "Outbound",
  CAMPAIGN: "Campanha",
  OTHER: "Outro",
};

export function formatLeadCurrency(value?: number | null) {
  if (typeof value !== "number") return "Nao estimado";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
