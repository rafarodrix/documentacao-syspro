import { prisma } from "@dosc-syspro/database";
import type {
  RemoteOpenSessionConflict,
  RemoteSessionPersistedRecord,
  RemoteSessionPort,
  RemoteSessionScope,
} from "@dosc-syspro/remote-domain";

type RemoteLogger = {
  info(event: string, fields?: Record<string, unknown>): void;
  warn(event: string, fields?: Record<string, unknown>): void;
  error(event: string, fields?: Record<string, unknown>): void;
};

type AddInternalTicketNoteFn = (input: { ticketId: string; body: string }) => Promise<void>;
type SendWhatsAppAlertFn = (input: { number: string; body: string }) => Promise<void>;

function buildScopeWhere(scope: RemoteSessionScope) {
  if (scope.isGlobalView) return {};
  return { companyId: { in: scope.companyIds.length ? scope.companyIds : ["__none__"] } };
}

function mapSessionStatus(status: string): "REQUESTED" | "STARTED" | "ENDED" | "FAILED" | "CANCELLED" {
  switch (status) {
    case "REQUESTED":
    case "STARTED":
    case "ENDED":
    case "FAILED":
    case "CANCELLED":
      return status;
    default:
      return "FAILED";
  }
}

function serializeSessionRecord(
  record: {
    createdAt?: Date | null;
    updatedAt?: Date | null;
    startedAt?: Date | null;
    endedAt?: Date | null;
    expiresAt?: Date | null;
  } & Record<string, unknown>,
): RemoteSessionPersistedRecord {
  return {
    ...record,
    createdAt: record.createdAt instanceof Date ? record.createdAt.toISOString() : record.createdAt,
    updatedAt: record.updatedAt instanceof Date ? record.updatedAt.toISOString() : record.updatedAt,
    startedAt: record.startedAt instanceof Date ? record.startedAt.toISOString() : record.startedAt,
    endedAt: record.endedAt instanceof Date ? record.endedAt.toISOString() : record.endedAt,
    expiresAt: record.expiresAt instanceof Date ? record.expiresAt.toISOString() : record.expiresAt,
  };
}

export function createRemoteSessionPort(params: {
  logger: RemoteLogger;
  addInternalTicketNote?: AddInternalTicketNoteFn;
  sendWhatsAppAlert?: SendWhatsAppAlertFn;
}): RemoteSessionPort {
  const { logger, addInternalTicketNote, sendWhatsAppAlert } = params;

  return {
    async listSessions(scope) {
      const sessions = await prisma.remoteSession.findMany({
        where: buildScopeWhere(scope),
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
      return prisma.remoteHost.findFirst({
        where: { id: input.hostId, companyId: input.companyId },
        select: { id: true, companyId: true, status: true, agentExternalId: true },
      });
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
      const session = await prisma.remoteSession.findUnique({
        where: { id: input.sessionId, ...buildScopeWhere(input.scope) },
        include: {
          host: { select: { id: true, name: true, agentExternalId: true, status: true } },
          company: { select: { nomeFantasia: true, razaoSocial: true, whatsapp: true } },
        },
      });

      if (!session) return null;

      return {
        id: session.id,
        status: mapSessionStatus(session.status),
        ticketId: session.ticketId,
        ticketNumber: session.ticketNumber,
        host: session.host as any,
        company: session.company as any,
      };
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
      const session = await prisma.remoteSession.findUnique({
        where: { id: input.sessionId, ...buildScopeWhere(input.scope) },
        include: {
          host: { select: { name: true } },
          company: { select: { nomeFantasia: true, razaoSocial: true, whatsapp: true } },
        },
      });

      if (!session) return null;

      return {
        id: session.id,
        status: mapSessionStatus(session.status),
        startedAt: session.startedAt,
        ticketId: session.ticketId,
        ticketNumber: session.ticketNumber,
        host: session.host,
        company: session.company as any,
      };
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
      if (addInternalTicketNote) {
        await addInternalTicketNote(input);
      }
    },
    async sendWhatsAppAlert(input) {
      if (sendWhatsAppAlert) {
        await sendWhatsAppAlert(input);
      }
    },
    async logInfo(event, fields) {
      logger.info(event, fields);
    },
    async logWarning(event, fields) {
      logger.warn(event, fields);
    },
    async logError(event, error, fields) {
      const errorMessage = error instanceof Error ? error.message : String(error ?? "unknown");
      logger.error(event, { ...(fields ?? {}), errorMessage });
    },
  };
}