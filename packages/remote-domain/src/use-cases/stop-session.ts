import { stopSessionInputSchema, type StopSessionOutput } from "../contracts";
import type { RemoteSessionPort } from "../ports";

function formatDuration(startedAt: Date | null) {
  if (!startedAt) return null;

  const diffMs = Date.now() - startedAt.getTime();
  const totalMinutes = Math.max(1, Math.round(diffMs / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (!hours) return `${minutes} min`;
  if (!minutes) return `${hours}h`;
  return `${hours}h ${minutes}min`;
}

function buildStopWhatsAppBody(input: {
  hostName: string;
  companyName: string;
  duration: string | null;
}) {
  const durationText = input.duration ? ` Duração: ${input.duration}.` : "";
  return `*Sessão Remota Encerrada*\n\nInformamos que o acesso ao computador *${input.hostName}* (${input.companyName}) foi finalizado.${durationText}\n\nObrigado pela confiança!`;
}

function buildStopNote(input: {
  sessionId: string;
  ticketNumber: string | null;
  hostName: string;
  companyName: string;
  operatorName: string;
  duration: string | null;
}) {
  const ticketLine = input.ticketNumber ? `<strong>Ticket:</strong> #${input.ticketNumber}<br />` : "";
  const durationLine = input.duration ? `<strong>Duracao:</strong> ${input.duration}<br />` : "";

  return [
    "<p><strong>Sessao remota encerrada</strong></p>",
    `<p>${ticketLine}<strong>Host:</strong> ${input.hostName}<br /><strong>Empresa:</strong> ${input.companyName}<br /><strong>Operador:</strong> ${input.operatorName}<br />${durationLine}<strong>Sessao:</strong> ${input.sessionId}</p>`,
  ].join("");
}

export async function stopSession(
  payload: unknown,
  deps: {
    port: RemoteSessionPort;
    now?: () => Date;
  },
): Promise<StopSessionOutput> {
  const input = stopSessionInputSchema.parse(payload);
  const context = await deps.port.findSessionForStop({
    sessionId: input.sessionId,
    scope: input.scope,
  });

  if (!context) {
    throw new Error("SESSION_NOT_FOUND");
  }

  if (context.status !== "STARTED") {
    throw new Error("SESSION_STOP_INVALID_STATUS");
  }

  const endedAt = deps.now ? deps.now() : new Date();
  const updated = await deps.port.updateSessionEnded({
    sessionId: context.id,
    endedAt,
  });

  if (context.ticketId) {
    try {
      await deps.port.addInternalTicketNote({
        ticketId: context.ticketId,
        body: buildStopNote({
          sessionId: context.id,
          ticketNumber: context.ticketNumber,
          hostName: context.host.name,
          companyName: context.company.nomeFantasia ?? context.company.razaoSocial ?? "Empresa sem nome",
          operatorName: input.actor.name ?? input.actor.email ?? input.actor.userId,
          duration: formatDuration(context.startedAt),
        }),
      });
    } catch (error) {
      await deps.port.logError("remote.domain.sessions.stop.ticket_note_failed", error, {
        sessionId: context.id,
        ticketId: context.ticketId,
      });
    }
  }

  if (context.company.whatsapp) {
    try {
      await deps.port.sendWhatsAppAlert({
        number: context.company.whatsapp,
        body: buildStopWhatsAppBody({
          hostName: context.host.name,
          companyName: context.company.nomeFantasia ?? context.company.razaoSocial ?? "Empresa sem nome",
          duration: formatDuration(context.startedAt),
        }),
      });
    } catch (error) {
      await deps.port.logError("remote.domain.sessions.stop.whatsapp_alert_failed", error, {
        sessionId: context.id,
        whatsapp: context.company.whatsapp,
      });
    }
  }

  await deps.port.logInfo("remote.domain.sessions.stop.succeeded", {
    sessionId: context.id,
    actorUserId: input.actor.userId,
    ticketId: context.ticketId,
    ticketNumber: context.ticketNumber,
  });

  return {
    session: updated,
  };
}