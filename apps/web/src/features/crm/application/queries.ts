import "server-only";

import type { CrmLead } from "@dosc-syspro/contracts/crm";
import type { LeadContactOption, LeadDashboardData } from "@/features/crm/domain/model";
import { fetchCrmLeadsGateway } from "@/features/crm/infrastructure/crm.gateway";
import { callBackendApi } from "@/lib/backend-api-client";

type RawContact = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  companies?: Array<{
    nomeFantasia?: string | null;
    razaoSocial: string;
  }>;
};

export async function getCrmLeadsData(): Promise<LeadDashboardData> {
  try {
    const response = await fetchCrmLeadsGateway();
    return {
      leads: response.success ? response.data : [],
    };
  } catch (error) {
    console.error("Erro ao carregar leads do CRM:", error);
    return { leads: [] };
  }
}

export async function getCrmLeadCreateData(): Promise<{ contacts: LeadContactOption[] }> {
  try {
    const contacts = await callBackendApi<RawContact[]>("contacts", "?limit=100");
    return {
      contacts: contacts.map((contact) => ({
        id: contact.id,
        name: contact.name,
        email: contact.email ?? null,
        phone: contact.whatsapp ?? contact.phone ?? null,
        whatsapp: contact.whatsapp ?? null,
        companies: (contact.companies ?? []).map((company) => company.nomeFantasia || company.razaoSocial),
      })),
    };
  } catch (error) {
    console.error("Erro ao carregar contatos para o CRM:", error);
    return { contacts: [] };
  }
}

export function groupLeadsByStage(leads: CrmLead[]) {
  return {
    LEAD: leads.filter((lead) => lead.stage === "LEAD"),
    MQL: leads.filter((lead) => lead.stage === "MQL"),
    SQL: leads.filter((lead) => lead.stage === "SQL"),
    PROPOSAL: leads.filter((lead) => lead.stage === "PROPOSAL"),
    NEGOTIATION: leads.filter((lead) => lead.stage === "NEGOTIATION"),
    WON: leads.filter((lead) => lead.stage === "WON"),
    LOST: leads.filter((lead) => lead.stage === "LOST"),
  };
}
