import { Prisma, Role, ZammadTicketCache } from "@prisma/client";
import { ZammadOperationalTicket } from "@/core/application/schema/zammad-api.schema";
import { prisma } from "@/lib/prisma";
import { computeTicketSla } from "@/core/application/services/zammad-sla";
import { OPERATIONAL_STATE_IDS, type QueueKey } from "@/core/config/tickets-workflow";

const SYSTEM_ROLES = new Set<Role>([Role.ADMIN, Role.DEVELOPER, Role.SUPORTE]);

function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function toCacheUpsertInput(ticket: ZammadOperationalTicket, lastEventType?: string) {
  const createdAt = parseDate(ticket.created_at) ?? new Date();
  const updatedAt = parseDate(ticket.updated_at) ?? createdAt;
  const firstResponseAt = parseDate(ticket.first_response_at);
  const resolvedAt = parseDate(ticket.close_at);
  const sla = computeTicketSla({
    createdAt,
    firstResponseAt,
    resolvedAt,
    priorityId: ticket.priority_id ?? null,
  });

  return {
    zammadTicketId: ticket.id,
    number: ticket.number,
    title: ticket.title,
    state: ticket.state ?? null,
    stateId: ticket.state_id ?? null,
    priorityId: ticket.priority_id ?? null,
    groupName: ticket.group ?? null,
    customer: ticket.customer ? String(ticket.customer) : null,
    ownerId: ticket.owner_id ?? null,
    firstResponseAt: sla.firstResponseAt,
    resolvedAt: sla.resolvedAt,
    escalationAt: parseDate(ticket.escalation_at),
    breached: sla.breached,
    createdAtZammad: createdAt,
    updatedAtZammad: updatedAt,
    lastEventType: lastEventType ?? null,
    lastSyncedAt: new Date(),
  };
}

export async function upsertOperationalTicketsToCache(
  tickets: ZammadOperationalTicket[],
  eventType?: string
): Promise<void> {
  if (!tickets.length) return;

  await prisma.$transaction(
    tickets.map((ticket) => {
      const data = toCacheUpsertInput(ticket, eventType);
      return prisma.zammadTicketCache.upsert({
        where: { zammadTicketId: ticket.id },
        create: data,
        update: data,
      });
    })
  );
}

export async function listCachedTickets(input: {
  role: Role;
  email: string;
  scopedEmails?: string[];
  page: number;
  pageSize: number;
  queue?: QueueKey;
  zammadUserId?: number | null;
}): Promise<{ rows: ZammadTicketCache[]; total: number }> {
  const where: Prisma.ZammadTicketCacheWhereInput = {
    stateId: { in: [...OPERATIONAL_STATE_IDS] },
  };

  if (!SYSTEM_ROLES.has(input.role)) {
    const emails = input.scopedEmails?.length ? input.scopedEmails : [input.email];
    where.OR = emails.map((value) => ({
      customer: { contains: value, mode: "insensitive" },
    }));
  }

  if (input.queue === "my_queue" && input.zammadUserId) {
    where.ownerId = input.zammadUserId;
  }

  if (input.queue === "unassigned") {
    where.ownerId = null;
  }

  if (input.queue === "critical") {
    where.priorityId = 3;
  }

  if (input.queue === "no_response") {
    where.firstResponseAt = null;
  }

  const [rows, total] = await prisma.$transaction([
    prisma.zammadTicketCache.findMany({
      where,
      orderBy: { updatedAtZammad: "desc" },
      skip: (input.page - 1) * input.pageSize,
      take: input.pageSize,
    }),
    prisma.zammadTicketCache.count({ where }),
  ]);

  return { rows, total };
}
