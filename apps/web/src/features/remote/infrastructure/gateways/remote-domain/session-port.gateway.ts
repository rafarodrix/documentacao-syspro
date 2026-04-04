import { createRemoteSessionPort as createSharedRemoteSessionPort } from "@dosc-syspro/api/remote-session-port";
import { ZammadGateway } from "@/features/tickets/infrastructure/gateways/zammad-gateway";
import type { RemoteSessionPort } from "@dosc-syspro/remote-domain";
import { evolutionWhatsApp } from "@/features/conversations/infrastructure/gateways/evolution-whatsapp.gateway";

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
      await ZammadGateway.addInternalTicketNote(input.ticketId, input.body);
    },
    sendWhatsAppAlert: async (input) => {
      await evolutionWhatsApp.sendTextMessage(input.number, input.body);
    },
  });
}
