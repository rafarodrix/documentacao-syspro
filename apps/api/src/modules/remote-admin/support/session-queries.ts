import { prisma } from "@dosc-syspro/database";
import type { RemoteTenantScope, RemoteSessionStatus, RemotePlatformOverview } from "./model";

function buildScopedWhere(companyIds: string[], isGlobalView: boolean) {
  return isGlobalView ? {} : { companyId: { in: companyIds.length ? companyIds : ["__none__"] } };
}

export async function getRemoteSessions(
  tenantScope: RemoteTenantScope,
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
  const scopedWhere = buildScopedWhere(tenantScope.companyIds, tenantScope.isGlobalView);
  const normalizedTicket = options?.ticket?.trim() ?? "";
  const pageSize = Math.min(Math.max(options?.pageSize ?? 20, 1), 100);
  const page = Math.max(options?.page ?? 1, 1);
  const hostScopeWhere = tenantScope.isGlobalView
    ? {}
    : { companyId: { in: tenantScope.companyIds.length ? tenantScope.companyIds : ["__none__"] } };

  const statusWhere =
    options?.status === "ACTIVE"
      ? { status: { in: ["REQUESTED", "STARTED"] as RemoteSessionStatus[] } }
      : options?.status
        ? { status: options.status }
        : {};

  const where = {
    ...scopedWhere,
    ...statusWhere,
    ...(options?.hostId ? { hostId: options.hostId } : {}),
    ...(normalizedTicket
      ? {
          OR: [
            { ticketNumber: { contains: normalizedTicket, mode: "insensitive" as const } },
            { ticketId: { contains: normalizedTicket, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [total, sessions, hostOptions] = await Promise.all([
    prisma.remoteSession.count({ where }),
    prisma.remoteSession.findMany({
      where,
      include: {
        company: { select: { nomeFantasia: true, razaoSocial: true } },
        host: { select: { id: true, name: true } },
        requestedByUser: { select: { name: true } },
      },
      orderBy: [{ createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.remoteHost.findMany({
      where: hostScopeWhere,
      select: { id: true, name: true },
      orderBy: [{ name: "asc" }],
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return {
    sessions: sessions.map((session) => ({
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
    })),
    pagination: {
      page,
      pageSize,
      total,
      totalPages,
      hasPreviousPage: page > 1,
      hasNextPage: page < totalPages,
    },
    hostOptions,
  };
}

export async function cleanupExpiredRemoteSessions() {
  const result = await prisma.remoteSession.updateMany({
    where: {
      status: { in: ["REQUESTED", "STARTED"] },
      expiresAt: { lt: new Date() },
    },
    data: {
      status: "ENDED",
      endedAt: new Date(),
    },
  });

  return { updatedCount: result.count };
}

export async function getActiveSessionsCount(tenantScope: RemoteTenantScope): Promise<number> {
  const scopedWhere = buildScopedWhere(tenantScope.companyIds, tenantScope.isGlobalView);

  return prisma.remoteSession.count({
    where: {
      ...scopedWhere,
      status: { in: ["REQUESTED", "STARTED"] },
    },
  });
}
