import { prisma } from "@dosc-syspro/database";
import { ConversationStatus as TicketStatus, Prisma } from "@prisma/client";
import { ApiError, createRouter, defineMutation, defineQuery } from "../router";

function parseTicketIdentifier(value: string) {
  const normalized = value?.trim();
  if (!normalized) {
    throw new ApiError("ticketId invalido.", "BAD_REQUEST");
  }
  return normalized;
}

function isAllowedQuickAction(action: string) {
  return ["touch", "resolve", "archive", "reopen"].includes(action);
}

export const ticketsRouter = createRouter({
  list: defineQuery({
    auth: "authenticated",
    handler: async () => {
      const tickets = await prisma.conversation.findMany({
        where: {
          OR: [{ ticketNumber: { not: null } }, { subject: { not: null } }],
        },
        orderBy: [{ updatedAt: "desc" }],
        take: 100,
        include: {
          company: { select: { id: true, razaoSocial: true, nomeFantasia: true } },
          companyContact: { select: { id: true, name: true, email: true, whatsapp: true } },
          assignedUser: { select: { id: true, name: true, email: true } },
        },
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
      const ticketId = parseTicketIdentifier(input.ticketId);
      const ticket = await prisma.conversation.findFirst({
        where: {
          OR: [{ id: ticketId }, { ticketNumber: ticketId }, { ticketId }],
        },
        include: {
          company: { select: { id: true, razaoSocial: true, nomeFantasia: true } },
          companyContact: { select: { id: true, name: true, email: true, whatsapp: true } },
          assignedUser: { select: { id: true, name: true, email: true } },
          resolvedByUser: { select: { id: true, name: true, email: true } },
          messages: {
            orderBy: { createdAt: "asc" },
          },
        },
      });

      if (!ticket) {
        throw new ApiError("Ticket nao encontrado.", "BAD_REQUEST");
      }

      return ticket;
    },
  }),
  quickAction: defineMutation<{ ticketId: string; action: string }, unknown>({
    auth: "role",
    roles: ["ADMIN", "DEVELOPER", "SUPORTE", "CLIENTE_ADMIN"],
    handler: async ({ input }) => {
      const ticketId = parseTicketIdentifier(input.ticketId);
      const action = typeof input.action === "string" ? input.action.trim().toLowerCase() : "";

      if (!isAllowedQuickAction(action)) {
        throw new ApiError("Acao rapida invalida. Use: touch, resolve, archive ou reopen.", "BAD_REQUEST");
      }

      const current = await prisma.conversation.findFirst({
        where: {
          OR: [{ id: ticketId }, { ticketNumber: ticketId }, { ticketId }],
        },
        select: { id: true, status: true },
      });

      if (!current) {
        throw new ApiError("Ticket nao encontrado.", "BAD_REQUEST");
      }

      let nextStatus: TicketStatus | undefined;
      if (action === "resolve") nextStatus = TicketStatus.RESOLVED;
      if (action === "archive") nextStatus = TicketStatus.ARCHIVED;
      if (action === "reopen") {
        nextStatus =
          current.status === TicketStatus.NEW || current.status === TicketStatus.UNASSIGNED
            ? current.status
            : TicketStatus.IN_PROGRESS;
      }

      const metadataPatch: Prisma.JsonObject = {
        lastQuickAction: action,
        lastQuickActionAt: new Date().toISOString(),
      };

      const updated = await prisma.conversation.update({
        where: { id: current.id },
        data: {
          status: nextStatus,
          closedAt:
            nextStatus === TicketStatus.RESOLVED || nextStatus === TicketStatus.ARCHIVED
              ? new Date()
              : nextStatus === TicketStatus.IN_PROGRESS || action === "touch"
                ? null
                : undefined,
          metadata: metadataPatch,
        },
        select: {
          id: true,
          ticketId: true,
          ticketNumber: true,
          status: true,
          closedAt: true,
          metadata: true,
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
