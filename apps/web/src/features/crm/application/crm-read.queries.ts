import "server-only";

import type { CrmLead } from "@dosc-syspro/contracts/crm";
import type { LeadDashboardData } from "@/features/crm/domain/crm.types";
import { fetchCrmLeadByIdGateway, fetchCrmLeadsGateway } from "@/features/crm/infrastructure/gateways/crm.gateway";

export async function getCrmLeadsData(): Promise<LeadDashboardData> {
  try {
    const params = new URLSearchParams({
      page: "1",
      pageSize: "100",
    });
    const response = await fetchCrmLeadsGateway(params);
    return {
      leads: response.success ? response.data : [],
      pagination: response.success ? (response.pagination ?? null) : null,
    };
  } catch (error) {
    console.error("Erro ao carregar leads do CRM:", error);
    return { leads: [], pagination: null };
  }
}

export async function getCrmLeadById(id: string): Promise<CrmLead | null> {
  try {
    return await fetchCrmLeadByIdGateway(id);
  } catch (error) {
    console.error("Erro ao carregar lead do CRM:", error);
    return null;
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
