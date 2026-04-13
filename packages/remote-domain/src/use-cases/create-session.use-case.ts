import { createSessionInputSchema, type CreateSessionOutput } from "../remote-domain.contracts";
import type { RemoteSessionPort } from "../remote-domain.port";

function canCreateSession(role: string): boolean {
  return role === "ADMIN" || role === "SUPORTE" || role === "DEVELOPER" || role === "CLIENTE_ADMIN";
}

function buildRequestedSessionExpiresAt(now: Date): Date {
  return new Date(now.getTime() + 30 * 60 * 1000);
}

function toNullOrTrimmed(value?: string | null): string | null {
  const next = value?.trim();
  return next ? next : null;
}

export async function createSession(
  payload: unknown,
  deps: {
    port: RemoteSessionPort;
    now?: () => Date;
  },
): Promise<CreateSessionOutput> {
  const input = createSessionInputSchema.parse(payload);

  if (!canCreateSession(input.actor.role)) {
    throw new Error("SESSION_CREATE_FORBIDDEN");
  }

  if (!input.scope.isGlobalView && !input.scope.companyIds.includes(input.companyId)) {
    throw new Error("SESSION_COMPANY_OUT_OF_SCOPE");
  }

  const host = await deps.port.findHostForSessionCreate({
    companyId: input.companyId,
    hostId: input.hostId,
  });

  if (!host) {
    throw new Error("SESSION_HOST_NOT_FOUND");
  }

  if (host.status === "ACTIVE" && !host.agentExternalId) {
    throw new Error("SESSION_HOST_MISCONFIGURED");
  }

  const ticketId = toNullOrTrimmed(input.ticketId);
  const ticketNumber = toNullOrTrimmed(input.ticketNumber);

  if (ticketId || ticketNumber) {
    const existingOpenSession = await deps.port.findOpenSessionConflict({
      companyId: input.companyId,
      hostId: input.hostId,
      ticketId,
      ticketNumber,
    });

    if (existingOpenSession) {
      const duplicateError = new Error("SESSION_DUPLICATE_OPEN");
      (duplicateError as Error & { data?: unknown }).data = existingOpenSession.record;
      throw duplicateError;
    }
  }

  const now = deps.now ? deps.now() : new Date();
  const created = await deps.port.createRequestedSession({
    companyId: input.companyId,
    hostId: input.hostId,
    ticketId,
    ticketNumber,
    reason: toNullOrTrimmed(input.reason),
    requestedByUserId: input.actor.userId,
    requestedAt: now,
    expiresAt: buildRequestedSessionExpiresAt(now),
  });

  await deps.port.logInfo("remote.domain.sessions.create.succeeded", {
    sessionId: created.id,
    companyId: input.companyId,
    hostId: input.hostId,
    actorUserId: input.actor.userId,
    ticketId,
    ticketNumber,
  });

  return {
    session: created,
  };
}