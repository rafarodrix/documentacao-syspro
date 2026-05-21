import {
  crmLeadListResponseSchema,
  crmLeadResponseSchema,
  crmSupportDataResponseSchema,
  crmLeadCreateSchema,
  type CrmLeadCreateInput,
  type CrmLead,
  type CrmLeadListResponse,
  type CrmLeadResponse,
  type CrmSupportDataResponse,
} from "@dosc-syspro/contracts/crm";
import { callWebApi } from "@/lib/web-api";

export async function fetchCrmLeadsGateway(search?: URLSearchParams): Promise<CrmLeadListResponse> {
  const suffix = search && Array.from(search.keys()).length > 0 ? `?${search.toString()}` : "";
  return crmLeadListResponseSchema.parse(await callWebApi(`/api/crm/leads${suffix}`).then((res) => res.json()));
}

export async function createCrmLeadGateway(input: CrmLeadCreateInput): Promise<CrmLeadResponse> {
  const payload = crmLeadCreateSchema.parse(input);
  return crmLeadResponseSchema.parse(
    await callWebApi("/api/crm/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).then((res) => res.json()),
  );
}

export async function fetchCrmLeadByIdGateway(id: string): Promise<CrmLead | null> {
  const response = crmLeadResponseSchema.parse(await callWebApi(`/api/crm/leads/${id}`).then((res) => res.json()));
  return response.success ? response.data ?? null : null;
}

export async function fetchCrmSupportDataGateway(): Promise<CrmSupportDataResponse> {
  return crmSupportDataResponseSchema.parse(await callWebApi("/api/crm/leads/support-data").then((res) => res.json()));
}
