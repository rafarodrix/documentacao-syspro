import { prisma } from "@dosc-syspro/database";
import { ApiError, createRouter, defineMutation, defineQuery } from "../router";

function parseTicketId(value: string) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new ApiError("ticketId invalido. Use o ID numerico do Zammad.", "BAD_REQUEST");
  }
  return parsed;
}

function isAllowedQuickAction(action: string) {
  return ["touch", "mark_breached", "clear_breached"].includes(action);
}

export const ticketsRouter = createRouter({
  list: defineQuery({
    auth: "authenticated",
    handler: async () => {
      const tickets = await prisma.zammadTicketCache.findMany({
        orderBy: [{ updatedAtZammad: "desc" }],
        take: 100,
      });
      return {
        total: tickets.length,
        items: tickets,
      };
    },
  }),
  details: defineQuery<{ ticketId: string }, unknown>({
    auth: "authenticated",
    handler: async ({ input }) => {
      const ticketId = parseTicketId(input.ticketId);
      const ticket = await prisma.zammadTicketCache.findUnique({
        where: { zammadTicketId: ticketId },
      });

      if (!ticket) {
        throw new ApiError("Ticket nao encontrado no cache operacional.", "BAD_REQUEST");
      }

      return ticket;
    },
  }),
  quickAction: defineMutation<{ ticketId: string; action: string }, unknown>({
    auth: "role",
    roles: ["ADMIN", "DEVELOPER", "SUPORTE", "CLIENTE_ADMIN"],
    handler: async ({ input }) => {
      const ticketId = parseTicketId(input.ticketId);
      const action = input.action?.trim().toLowerCase();

      if (!isAllowedQuickAction(action)) {
        throw new ApiError("Acao rapida invalida. Use: touch, mark_breached ou clear_breached.", "BAD_REQUEST");
      }

      const current = await prisma.zammadTicketCache.findUnique({
        where: { zammadTicketId: ticketId },
        select: { id: true },
      });

      if (!current) {
        throw new ApiError("Ticket nao encontrado no cache operacional.", "BAD_REQUEST");
      }

      const updated = await prisma.zammadTicketCache.update({
        where: { zammadTicketId: ticketId },
        data:
          action === "mark_breached"
            ? { breached: true, lastSyncedAt: new Date() }
            : action === "clear_breached"
              ? { breached: false, lastSyncedAt: new Date() }
              : { lastSyncedAt: new Date() },
        select: {
          zammadTicketId: true,
          breached: true,
          lastSyncedAt: true,
          updatedAt: true,
        },
      });

      return {
        action,
        ticket: updated,
      };
    },
  }),
});