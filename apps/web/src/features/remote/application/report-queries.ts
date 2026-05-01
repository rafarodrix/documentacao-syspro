import { z } from "zod";
import type { RemoteTenantScope } from "@/features/remote/domain/remote-host.types";
import { fetchRemoteEfficiencyMetricsGateway } from "@/features/remote/infrastructure/gateways/remote-admin.gateway";

export interface EfficiencyMetrics {
  averageTimeToRemoteSeconds: number | null;
  averageSessionDurationSeconds: number | null;
  totalSessionsCount: number;
  totalTicketsWithRemote: number;
  sessions: Array<{
    sessionId: string;
    hostId?: string;
    ticketNumber: string | null;
    hostName: string;
    companyName: string;
    requestedByName: string;
    timeToRemoteSeconds: number | null;
    durationSeconds: number | null;
    createdAt: string;
  }>;
}

export const efficiencyMetricsSchema = z.object({
  averageTimeToRemoteSeconds: z.number().nullable(),
  averageSessionDurationSeconds: z.number().nullable(),
  totalSessionsCount: z.number(),
  totalTicketsWithRemote: z.number(),
  sessions: z.array(
    z.object({
      sessionId: z.string(),
      hostId: z.string().optional(),
      ticketNumber: z.string().nullable(),
      hostName: z.string(),
      companyName: z.string(),
      requestedByName: z.string(),
      timeToRemoteSeconds: z.number().nullable(),
      durationSeconds: z.number().nullable(),
      createdAt: z.string(),
    }),
  ),
});

export async function getRemoteEfficiencyMetrics(_tenantScope: RemoteTenantScope): Promise<EfficiencyMetrics> {
  return fetchRemoteEfficiencyMetricsGateway();
}
