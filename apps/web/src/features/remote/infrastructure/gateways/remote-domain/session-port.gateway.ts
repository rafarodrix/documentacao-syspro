import { prisma } from "@/lib/prisma";
import { ZammadGateway } from "@/features/tickets/infrastructure/gateways/zammad-gateway";
import type {
  RemoteOpenSessionConflict,
  RemoteSessionPort,
  RemoteSessionScope,
  RemoteSessionPersistedRecord,
} from "@dosc-syspro/remote-domain";

type RemoteLogger = {
  info(event: string, fields?: Record<string, unknown>): void;
  warn(event: string, fields?: Record<string, unknown>): void;
  error(event: string, error?: unknown, fields?: Record<string, unknown>): void;
};

function buildScopeWhere(scope: RemoteSessionScope) {
  if (scope.isGlobalView) return {};
  return { companyId: { in: scope.companyIds.length ? scope.companyIds : ["__none__"] } };
}

function serializeSessionRecord(record: Record<string, unknown>): RemoteSessionPersistedRecord {
  return {
    ...record,
    createdAt: record.createdAt instanceof Date ? record.createdAt.toISOString() : record.createdAt,
    updatedAt: record.updatedAt instanceof Date ? record.updatedAt.toISOString() : record.updatedAt,
    startedAt: record.startedAt instanceof Date ? record.startedAt.toISOString() : record.startedAt,
    endedAt: record.endedAt instanceof Date ? record.endedAt.toISOString() : record.endedAt,
    expiresAt: record.expiresAt instanceof Date ? record.expiresAt.toISOString() : record.expiresAt,
  };
}

export function createRemoteSessionPort(params: { logger: RemoteLogger }): RemoteSessionPort {
  const { logger } = params;

  return {
    async listSessions(scope) {
      const where = buildScopeWhere(scope);
      const sessions = await prisma.remoteSession.findMany({
        where,
        include: {
          company: { select: { id: true, nomeFantasia: true, razaoSocial: true } },
          host: { select: { id: true, name: true } },
          requestedByUser: { select: { id: true, name: true, email: true } },
          startedByUser: { select: { id: true, name: true, email: true } },
        },
        orderBy: [{ createdAt: "desc" }],
      });

      return sessions.map((session) => serializeSessionRecord(session as unknown as Record<string, unknown>));
    },
    async findHostForSessionCreate(input) {
      const host = await prisma.remoteHost.findFirst({
        where: { id: input.hostId, companyId: input.companyId },
        select: { id: true, companyId: true, status: true, agentExternalId: true },
      });

      return host;
    },
    async findOpenSessionConflict(input) {
      const whereTicket = input.ticketId ? { ticketId: input.ticketId } : input.ticketNumber ? { ticketNumber: input.ticketNumber } : null;
      if (!whereTicket) return null;

      const existingOpenSession = await prisma.remoteSession.findFirst({
        where: {
          companyId: input.companyId,
          hostId: input.hostId,
          ...whereTicket,
          status: { in: ["REQUESTED", "STARTED"] },
        },
        orderBy: [{ createdAt: "desc" }],
      });

      if (!existingOpenSession) return null;

      const conflict: RemoteOpenSessionConflict = {
        id: existingOpenSession.id,
        ticketNumber: existingOpenSession.ticketNumber,
        record: serializeSessionRecord(existingOpenSession as unknown as Record<string, unknown>),
      };

      return conflict;
    },
    async createRequestedSession(input) {
      const session = await prisma.remoteSession.create({
        data: {
          companyId: input.companyId,
          hostId: input.hostId,
          ticketId: input.ticketId,
          ticketNumber: input.ticketNumber,
          reason: input.reason,
          requestedByUserId: input.requestedByUserId,
          status: "REQUESTED",
          createdAt: input.requestedAt,
          updatedAt: input.requestedAt,
          expiresAt: input.expiresAt,
        },
      });

      return serializeSessionRecord(session as unknown as Record<string, unknown>);
    },
    async findSessionForStart(input) {
      const where = buildScopeWhere(input.scope);
      const session = await prisma.remoteSession.findFirst({
        where: {
          id: input.sessionId,
          ...where,
        },
        select: {
          id: true,
          status: true,
          ticketId: true,
          ticketNumber: true,
          host: { select: { id: true, name: true, agentExternalId: true, status: true } },
          company: { select: { nomeFantasia: true, razaoSocial: true } },
        },
      });

      return session;
    },
    async findConcurrentStartedSession(input) {
      return prisma.remoteSession.findFirst({
        where: {
          hostId: input.hostId,
          status: "STARTED",
          id: { not: input.excludeSessionId },
        },
        select: { id: true, ticketNumber: true },
      });
    },
    async updateSessionStarted(input) {
      const updated = await prisma.remoteSession.update({
        where: { id: input.sessionId },
        data: {
          status: "STARTED",
          startedAt: input.startedAt,
          expiresAt: input.expiresAt,
          startedByUserId: input.startedByUserId,
        },
      });

      return serializeSessionRecord(updated as unknown as Record<string, unknown>);
    },
    async findSessionForStop(input) {
      const where = buildScopeWhere(input.scope);
      const session = await prisma.remoteSession.findFirst({
        where: {
          id: input.sessionId,
          ...where,
        },
        select: {
          id: true,
          status: true,
          startedAt: true,
          ticketId: true,
          ticketNumber: true,
          host: { select: { name: true } },
          company: { select: { nomeFantasia: true, razaoSocial: true } },
        },
      });

      return session;
    },
    async updateSessionEnded(input) {
      const updated = await prisma.remoteSession.update({
        where: { id: input.sessionId },
        data: {
          status: "ENDED",
          endedAt: input.endedAt,
          expiresAt: null,
        },
      });

      return serializeSessionRecord(updated as unknown as Record<string, unknown>);
    },
    async addInternalTicketNote(input) {
      await ZammadGateway.addInternalTicketNote(input.ticketId, input.body);
    },
    async logInfo(event, fields) {
      logger.info(event, fields);
    },
    async logWarning(event, fields) {
      logger.warn(event, fields);
    },
    async logError(event, error, fields) {
      logger.error(event, error, fields);
    },
  };
}