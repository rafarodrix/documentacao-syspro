import type { RemoteTenantScope } from "@/features/remote/domain/model";
import type { RemoteSessionStatus, RemotePlatformOverview } from "@/features/remote/domain/model";
import { fetchRemoteSessionsGateway } from "@/features/remote/infrastructure/remote-admin.gateway";

export async function getRemoteSessions(
  _tenantScope: RemoteTenantScope,
  options?: {
    status?: RemoteSessionStatus | "ACTIVE";
    hostId?: string;
    ticket?: string;
    page?: number;
    pageSize?: number;
  }
): Promise<{
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
}> {
  return fetchRemoteSessionsGateway(options);
}

export async function cleanupExpiredRemoteSessions() {
  return { updatedCount: 0 };
}

export async function getActiveSessionsCount(_tenantScope: RemoteTenantScope): Promise<number> {
  const result = await fetchRemoteSessionsGateway({ status: "ACTIVE", page: 1, pageSize: 1 });
  return result.pagination.total;
}
