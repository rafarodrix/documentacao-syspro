import {
  agentDeviceListResultSchema,
  type AgentDeviceListResult,
} from "@dosc-syspro/contracts/agent";

export async function fetchAgentDeviceListClient(params?: {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: "all" | "online" | "offline";
}): Promise<AgentDeviceListResult> {
  const search = new URLSearchParams();
  if (params?.page) search.set("page", String(params.page));
  if (params?.pageSize) search.set("pageSize", String(params.pageSize));
  if (params?.search) search.set("search", params.search);
  if (params?.status && params.status !== "all") search.set("status", params.status);
  const query = search.toString();

  const res = await fetch(`/api/agents${query ? `?${query}` : ""}`);
  if (!res.ok) throw new Error(`Falha ao consultar dispositivos: ${res.status}`);
  const json = (await res.json()) as { success: boolean; data: unknown };
  if (!json?.success) throw new Error("Resposta inválida");
  return agentDeviceListResultSchema.parse(json.data);
}
