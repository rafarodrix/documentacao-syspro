import { callWebApi } from "@/lib/web-api";
import type {
  RemoteHostDetails,
  RemotePaginationMeta,
  RemotePlatformDirectory,
  RemotePlatformOverview,
  RemoteSessionStatus,
} from "@/features/remote/domain/model";
import type { EfficiencyMetrics } from "@/features/remote/application/report-queries";

export async function fetchRemotePlatformDirectoryGateway(): Promise<RemotePlatformDirectory> {
  return callWebApi("/api/remote-admin/directory").then((res) => res.json() as Promise<RemotePlatformDirectory>);
}

export async function fetchRemotePlatformOverviewGateway(): Promise<RemotePlatformOverview> {
  return callWebApi("/api/remote-admin/overview").then((res) => res.json() as Promise<RemotePlatformOverview>);
}

export async function fetchRemoteHostDetailsGateway(hostId: string): Promise<RemoteHostDetails | null> {
  return callWebApi(`/api/remote-admin/hosts/${hostId}/details`).then((res) => res.json() as Promise<RemoteHostDetails | null>);
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

  return callWebApi(`/api/remote-admin/sessions${search ? `?${search}` : ""}`).then((res) => res.json() as Promise<{
    sessions: RemotePlatformOverview["recentSessions"];
    pagination: RemotePaginationMeta;
    hostOptions: Array<{ id: string; name: string }>;
  }>);
}

export async function fetchRemoteEfficiencyMetricsGateway(): Promise<EfficiencyMetrics> {
  return callWebApi("/api/remote-admin/reports/efficiency").then((res) => res.json() as Promise<EfficiencyMetrics>);
}
