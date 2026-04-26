import { callBackendApi } from "@/lib/backend-api-client";
import type {
  RemoteHostDetails,
  RemotePlatformDirectory,
  RemotePlatformOverview,
  RemoteSessionStatus,
} from "@/features/remote/domain/model";
import type { EfficiencyMetrics } from "@/features/remote/application/report-queries";

export async function fetchRemotePlatformDirectoryGateway(): Promise<RemotePlatformDirectory> {
  return callBackendApi<RemotePlatformDirectory>("remote-admin", "/directory");
}

export async function fetchRemotePlatformOverviewGateway(): Promise<RemotePlatformOverview> {
  return callBackendApi<RemotePlatformOverview>("remote-admin", "/overview");
}

export async function fetchRemoteHostDetailsGateway(hostId: string): Promise<RemoteHostDetails | null> {
  return callBackendApi<RemoteHostDetails | null>("remote-admin", `/hosts/${hostId}/details`);
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

  return callBackendApi<{
    sessions: RemotePlatformOverview["recentSessions"];
    pagination: {
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
      hasPreviousPage: boolean;
      hasNextPage: boolean;
    };
    hostOptions: Array<{ id: string; name: string }>;
  }>("remote-admin", `/sessions${search ? `?${search}` : ""}`);
}

export async function fetchRemoteEfficiencyMetricsGateway(): Promise<EfficiencyMetrics> {
  return callBackendApi<EfficiencyMetrics>("remote-admin", "/reports/efficiency");
}
