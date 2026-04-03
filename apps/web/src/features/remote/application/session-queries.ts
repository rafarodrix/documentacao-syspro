import { prisma } from "@/lib/prisma";
import { getRemoteTenantScope } from "@/features/remote/application/scope";
import type { RemoteSessionStatus, RemotePlatformOverview } from "@/features/remote/domain/model";

function buildScopedWhere(companyIds: string[], isGlobalView: boolean) {
  return isGlobalView ? {} : { companyId: { in: companyIds.length ? companyIds : ["__none__"] } };
}

export async function getRemoteSessions(options?: {
  status?: RemoteSessionStatus;
  limit?: number;
}): Promise<RemotePlatformOverview["recentSessions"]> {
  const tenantScope = await getRemoteTenantScope();
  const scopedWhere = buildScopedWhere(tenantScope.companyIds, tenantScope.isGlobalView);

  const sessions = await prisma.remoteSession.findMany({
    where: {
      ...scopedWhere,
      ...(options?.status ? { status: options.status } : {}),
    },
    include: {
      company: { select: { nomeFantasia: true, razaoSocial: true } },
      host: { select: { name: true } },
      requestedByUser: { select: { name: true } },
    },
    orderBy: [{ createdAt: "desc" }],
    take: options?.limit ?? 50,
  });

  return sessions.map((session) => ({
    id: session.id,
    companyId: session.companyId,
    ticketId: session.ticketId,
    ticketNumber: session.ticketNumber,
    hostId: session.hostId,
    requestedByUserId: session.requestedByUserId,
    startedByUserId: session.startedByUserId,
    status: session.status as RemoteSessionStatus,
    hostName: session.host.name,
    companyName: session.company.nomeFantasia ?? session.company.razaoSocial,
    requestedByName: session.requestedByUser.name,
    createdAt: session.createdAt.toISOString(),
    startedAt: session.startedAt?.toISOString() ?? null,
    endedAt: session.endedAt?.toISOString() ?? null,
  }));
}

export async function getActiveSessionsCount(): Promise<number> {
  const tenantScope = await getRemoteTenantScope();
  const scopedWhere = buildScopedWhere(tenantScope.companyIds, tenantScope.isGlobalView);

  return prisma.remoteSession.count({
    where: {
      ...scopedWhere,
      status: { in: ["REQUESTED", "STARTED"] },
    },
  });
}
