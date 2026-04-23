import type { CrmLead, CrmLeadSource, CrmLeadStage } from "@dosc-syspro/contracts/crm";

export type LeadContactOption = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  companies: string[];
};

export type LeadDashboardData = {
  leads: CrmLead[];
};

export const CRM_STAGE_LABELS: Record<CrmLeadStage, string> = {
  LEAD: "Lead",
  MQL: "MQL",
  SQL: "SQL",
  PROPOSAL: "Proposta",
  NEGOTIATION: "Negociacao",
  WON: "Ganho",
  LOST: "Perdido",
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
