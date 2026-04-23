import {
  crmLeadListResponseSchema,
  crmLeadResponseSchema,
  crmSupportDataResponseSchema,
  crmLeadCreateSchema,
  type CrmLeadCreateInput,
  type CrmLeadListResponse,
  type CrmLeadResponse,
  type CrmSupportDataResponse,
} from "@dosc-syspro/contracts/crm";
import { callBackendApi } from "@/lib/backend-api-client";

export async function fetchCrmLeadsGateway(search?: URLSearchParams): Promise<CrmLeadListResponse> {
  const suffix = search && Array.from(search.keys()).length > 0 ? `?${search.toString()}` : "";
  return crmLeadListResponseSchema.parse(await callBackendApi("crm", `/leads${suffix}`));
}

export async function createCrmLeadGateway(input: CrmLeadCreateInput): Promise<CrmLeadResponse> {
  const payload = crmLeadCreateSchema.parse(input);
  return crmLeadResponseSchema.parse(
    await callBackendApi("crm", "/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  );
}

export async function fetchCrmSupportDataGateway(): Promise<CrmSupportDataResponse> {
  return crmSupportDataResponseSchema.parse(await callBackendApi("crm", "/leads/support-data"));
}
