import type { CrmLead, CrmLeadManualContact } from "@dosc-syspro/contracts/crm";
import { formatCNPJ } from "@/lib/formatters";

export type LeadFormState = {
  title: string;
  stage: string;
  source: string;
  companyName: string;
  tradeName: string;
  document: string;
  industry: string;
  companySize: string;
  city: string;
  state: string;
  estimatedValue: string;
  licenseValue: string;
  monthlyFee: string;
  minimumWagePercentage: string;
  expectedCloseAt: string;
  nextStep: string;
  qualificationNotes: string;
  lostReason: string;
};

export type LeadStatusFilter = "ACTIVE" | "WON" | "LOST";
export type LeadAttentionFilter = "ALL" | "OVERDUE" | "NO_NEXT_STEP" | "DUE_SOON";
export type PipelineColumnId = "LEAD" | "VALIDATION" | "PROPOSAL" | "NEGOTIATION";

export const DEFAULT_FORM_STATE: LeadFormState = {
  title: "",
  stage: "LEAD",
  source: "MANUAL",
  companyName: "",
  tradeName: "",
  document: "",
  industry: "",
  companySize: "",
  city: "",
  state: "",
  estimatedValue: "",
  licenseValue: "",
  monthlyFee: "",
  minimumWagePercentage: "",
  expectedCloseAt: "",
  nextStep: "",
  qualificationNotes: "",
  lostReason: "",
};

export const EMPTY_CONTACT: CrmLeadManualContact = {
  name: "",
  role: "",
  email: "",
  phone: "",
  whatsapp: "",
  isPrimary: false,
  notes: "",
};

export function parseNullableNumber(value: string) {
  const normalized = value.trim().replace(",", ".");
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function mapLeadToFormState(lead?: CrmLead | null): LeadFormState {
  if (!lead) return DEFAULT_FORM_STATE;
  return {
    title: lead.title ?? "",
    stage: lead.stage ?? "LEAD",
    source: lead.source ?? "MANUAL",
    companyName: lead.companyName ?? "",
    tradeName: lead.tradeName ?? "",
    document: lead.document ? formatCNPJ(lead.document) : "",
    industry: lead.industry ?? "",
    companySize: lead.companySize ?? "",
    city: lead.city ?? "",
    state: lead.state ?? "",
    estimatedValue: typeof lead.estimatedValue === "number" ? String(lead.estimatedValue) : "",
    licenseValue: typeof lead.licenseValue === "number" ? String(lead.licenseValue) : "",
    monthlyFee: typeof lead.monthlyFee === "number" ? String(lead.monthlyFee) : "",
    minimumWagePercentage: typeof lead.minimumWagePercentage === "number" ? String(lead.minimumWagePercentage) : "",
    expectedCloseAt: lead.expectedCloseAt ? lead.expectedCloseAt.slice(0, 10) : "",
    nextStep: lead.nextStep ?? "",
    qualificationNotes: lead.qualificationNotes ?? "",
    lostReason: lead.lostReason ?? "",
  };
}
