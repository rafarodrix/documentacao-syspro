import { callWebApi } from "@/lib/web-api";
import {
  RemoteHostDetails,
  RemotePaginationMeta,
  RemotePlatformDirectory,
  RemotePlatformOverview,
  RemoteSessionStatus,
  remoteHostDetailsSchema,
  remotePlatformDirectorySchema,
  remotePlatformOverviewSchema,
  remoteSessionsGatewayResponseSchema,
} from "@/features/remote/domain/remote-host.types";
import type { EfficiencyMetrics } from "@/features/remote/application/report-queries";
import { efficiencyMetricsSchema } from "@/features/remote/application/report-queries";
import type { ZodType } from "zod";

async function parseRemoteGatewayResponse<T>(
  path: string,
  schema: ZodType<T>,
): Promise<T> {
  const response = await callWebApi(path);
  const json = await response.json();
  const parsed = schema.safeParse(json);

  if (!parsed.success) {
    const issueSummary = parsed.error.issues
      .slice(0, 5)
      .map((issue) => `${issue.path.join(".") || "<root>"}: ${issue.message}`)
      .join("; ");
    throw new Error(`Resposta remota invalida em ${path}: ${issueSummary}`);
  }

  return parsed.data;
}

export async function fetchRemotePlatformDirectoryGateway(): Promise<RemotePlatformDirectory> {
  return parseRemoteGatewayResponse("/api/remote-admin/directory", remotePlatformDirectorySchema);
}

export async function fetchRemotePlatformOverviewGateway(): Promise<RemotePlatformOverview> {
  return parseRemoteGatewayResponse("/api/remote-admin/overview", remotePlatformOverviewSchema);
}

export async function fetchRemoteHostDetailsGateway(hostId: string): Promise<RemoteHostDetails | null> {
  return parseRemoteGatewayResponse(`/api/remote-admin/hosts/${hostId}/details`, remoteHostDetailsSchema);
}

export async function fetchRemoteSessionsGateway(options?: {
  status?: RemoteSessionStatus | "ACTIVE";
  hostId?: string;
  ticket?: string;
  page?: number;
  pageSize?: number;
}) {
  const params = new URLSearchParams();
  if (options?.status) params.set("status", options.status);
  if (options?.hostId) params.set("hostId", options.hostId);
  if (options?.ticket) params.set("ticket", options.ticket);
  if (options?.page) params.set("page", String(options.page));
  if (options?.pageSize) params.set("pageSize", String(options.pageSize));
  const search = params.toString();

  return parseRemoteGatewayResponse(`/api/remote-admin/sessions${search ? `?${search}` : ""}`, remoteSessionsGatewayResponseSchema) as Promise<{
    sessions: RemotePlatformOverview["recentSessions"];
    pagination: RemotePaginationMeta;
    hostOptions: Array<{ id: string; name: string }>;
  }>;
}

export async function fetchRemoteEfficiencyMetricsGateway(): Promise<EfficiencyMetrics> {
  return parseRemoteGatewayResponse("/api/remote-admin/reports/efficiency", efficiencyMetricsSchema);
}
