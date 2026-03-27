import { startSessionInputSchema, type StartSessionOutput } from "../contracts";
import type { RemoteSessionPort } from "../ports";

function buildStartedSessionExpiresAt(now: Date): Date {
  return new Date(now.getTime() + 8 * 60 * 60 * 1000);
}

function buildStartNote(input: {
  sessionId: string;
  ticketNumber: string | null;
  hostName: string;
  companyName: string;
  operatorName: string;
}) {
  const ticketLine = input.ticketNumber ? `<strong>Ticket:</strong> #${input.ticketNumber}<br />` : "";
  return [
    "<p><strong>Sessao remota iniciada</strong></p>",
    `<p>${ticketLine}<strong>Host:</strong> ${input.hostName}<br /><strong>Empresa:</strong> ${input.companyName}<br /><strong>Operador:</strong> ${input.operatorName}<br /><strong>Sessao:</strong> ${input.sessionId}</p>`,
  ].join("");
}

export async function startSession(
  payload: unknown,
  deps: {
    port: RemoteSessionPort;
    now?: () => Date;
  },
): Promise<StartSessionOutput> {
  const input = startSessionInputSchema.parse(payload);
  const context = await deps.port.findSessionForStart({
    sessionId: input.sessionId,
    scope: input.scope,
  });

  if (!context) {
    throw new Error("SESSION_NOT_FOUND");
  }

  if (context.status !== "REQUESTED") {
    throw new Error("SESSION_START_INVALID_STATUS");
  }

  if (context.host.status === "ACTIVE" && !context.host.agentExternalId) {
    throw new Error("SESSION_HOST_MISCONFIGURED");
  }

  const existingStarted = await deps.port.findConcurrentStartedSession({
    hostId: context.host.id,
    excludeSessionId: context.id,
  });

  if (existingStarted) {
    const conflictError = new Error("SESSION_START_CONCURRENT");
    (conflictError as Error & { data?: unknown }).data = existingStarted;
    throw conflictError;
  }

  const startedAt = deps.now ? deps.now() : new Date();
  const updated = await deps.port.updateSessionStarted({
    sessionId: context.id,
    startedAt,
    expiresAt: buildStartedSessionExpiresAt(startedAt),
    startedByUserId: input.actor.userId,
  });

  if (context.ticketId) {
    try {
      await deps.port.addInternalTicketNote({
        ticketId: context.ticketId,
        body: buildStartNote({
          sessionId: context.id,
          ticketNumber: context.ticketNumber,
          hostName: context.host.name,
          companyName: context.company.nomeFantasia ?? context.company.razaoSocial ?? "Empresa sem nome",
          operatorName: input.actor.name ?? input.actor.email ?? input.actor.userId,
        }),
      });
    } catch (error) {
      await deps.port.logError("remote.domain.sessions.start.ticket_note_failed", error, {
        sessionId: context.id,
        ticketId: context.ticketId,
      });
    }
  }

  await deps.port.logInfo("remote.domain.sessions.start.succeeded", {
    sessionId: context.id,
    actorUserId: input.actor.userId,
    hostId: context.host.id,
    ticketId: context.ticketId,
    ticketNumber: context.ticketNumber,
  });

  return {
    session: updated,
  };
}