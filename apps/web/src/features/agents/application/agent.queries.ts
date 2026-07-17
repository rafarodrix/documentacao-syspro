import {
  agentInstallationListResultSchema,
  agentInstallationSummarySchema,
  agentFleetStatsSchema,
  type AgentInstallationListResult,
  type AgentInstallationSummary,
  type AgentFleetStats,
} from "@dosc-syspro/contracts/agent";
import { callWebApi } from "@/lib/web-api";

type SuccessEnvelope<T> = { success: true; data: T };

async function fetchEnvelope<T>(path: string, schema: { parse: (input: unknown) => T }): Promise<T> {
  const response = await callWebApi(path);
  if (!response.ok) {
    throw new Error(`Falha ao consultar ${path}: ${response.status}`);
  }
  const json = (await response.json()) as SuccessEnvelope<unknown>;
  if (!json || json.success !== true) {
    throw new Error(`Resposta invalida em ${path}`);
  }
  return schema.parse(json.data);
}

export async function fetchAgentFleetStats(): Promise<AgentFleetStats> {
  return fetchEnvelope("/api/agents/stats", agentFleetStatsSchema);
}

export async function fetchAgentInstallationList(params?: {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: "all" | "online" | "offline";
  companyId?: string;
  remoteHostId?: string;
}): Promise<AgentInstallationListResult> {
  const search = new URLSearchParams();
  if (params?.page) search.set("page", String(params.page));
  if (params?.pageSize) search.set("pageSize", String(params.pageSize));
  if (params?.search) search.set("search", params.search);
  if (params?.status && params.status !== "all") search.set("status", params.status);
  if (params?.companyId) search.set("companyId", params.companyId);
  if (params?.remoteHostId) search.set("remoteHostId", params.remoteHostId);
  const query = search.toString();
  return fetchEnvelope(`/api/agents${query ? `?${query}` : ""}`, agentInstallationListResultSchema);
}

export async function fetchLinkedAgentInstallation(remoteHostId: string) {
  const result = await fetchAgentInstallationList({ remoteHostId, pageSize: 1 });
  return result.items[0] ?? null;
}

export async function fetchAgentInstallation(deviceId: string): Promise<AgentInstallationSummary> {
  return fetchEnvelope(`/api/agents/${encodeURIComponent(deviceId)}`, agentInstallationSummarySchema);
}
