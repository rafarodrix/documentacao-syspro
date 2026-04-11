import type { RemoteTenantScope } from "@/features/remote/domain/model";
import { fetchRemoteEfficiencyMetricsGateway } from "@/features/remote/infrastructure/remote-admin.gateway";

export interface EfficiencyMetrics {
  averageTimeToRemoteSeconds: number | null;
  averageSessionDurationSeconds: number | null;
  totalSessionsCount: number;
  totalTicketsWithRemote: number;
  sessions: Array<{
    sessionId: string;
    ticketNumber: string | null;
    hostName: string;
    companyName: string;
    requestedByName: string;
    timeToRemoteSeconds: number | null;
    durationSeconds: number | null;
    createdAt: string;
  }>;
}

export async function getRemoteEfficiencyMetrics(_tenantScope: RemoteTenantScope): Promise<EfficiencyMetrics> {
  return fetchRemoteEfficiencyMetricsGateway();
}
