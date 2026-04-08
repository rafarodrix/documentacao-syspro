import { createRemoteSessionPort as createSharedRemoteSessionPort } from "@dosc-syspro/api/remote-session-port";
import type { RemoteSessionPort } from "@dosc-syspro/remote-domain";
import { evolutionWhatsApp } from "@/lib/integrations/evolution-whatsapp.gateway";

type RemoteLogger = {
  info(event: string, fields?: Record<string, unknown>): void;
  warn(event: string, fields?: Record<string, unknown>): void;
  error(event: string, error?: unknown, fields?: Record<string, unknown>): void;
};

export function createRemoteSessionPort(params: { logger: RemoteLogger }): RemoteSessionPort {
  const { logger } = params;

  return createSharedRemoteSessionPort({
    logger: {
      info: (event, fields) => logger.info(event, fields),
      warn: (event, fields) => logger.warn(event, fields),
      error: (event, fields) => logger.error(event, undefined, fields),
    },
    addInternalTicketNote: async (input) => {
      logger.info("remote.ticket_note.skipped", {
        ticketId: input.ticketId,
        reason: "external_ticket_integration_removed",
      });
    },
    sendWhatsAppAlert: async (input) => {
      await evolutionWhatsApp.sendTextMessage(input.number, input.body);
    },
  });
}


