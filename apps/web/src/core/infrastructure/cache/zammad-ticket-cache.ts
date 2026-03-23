import { Prisma, Role, ZammadTicketCache } from "@prisma/client";
import { ZammadOperationalTicket } from "@dosc-syspro/contracts";
import { prisma } from "@/lib/prisma";
import { computeTicketSla } from "@/core/application/services/zammad-sla";
import { CLOSED_STATE_IDS, OPERATIONAL_STATE_IDS, getStateIdsForStatusGroup, type QueueKey, type TicketStatusGroup } from "@dosc-syspro/core";

const SYSTEM_ROLES = new Set<Role>([Role.ADMIN, Role.DEVELOPER, Role.SUPORTE]);
const CACHE_UPSERT_CHUNK_SIZE = 50;
const CACHE_UPSERT_MAX_RETRIES = 3;

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

  const newestByTicketId = new Map<number, ZammadOperationalTicket>();
  for (const ticket of tickets) {
    const existing = newestByTicketId.get(ticket.id);
    if (!existing) {
      newestByTicketId.set(ticket.id, ticket);
      continue;
    }

    const existingUpdatedAt = parseDate(existing.updated_at)?.getTime() ?? 0;
    const incomingUpdatedAt = parseDate(ticket.updated_at)?.getTime() ?? 0;
    if (incomingUpdatedAt >= existingUpdatedAt) {
      newestByTicketId.set(ticket.id, ticket);
    }
  }

  const dedupedTickets = Array.from(newestByTicketId.values());

  for (let i = 0; i < dedupedTickets.length; i += CACHE_UPSERT_CHUNK_SIZE) {
    const chunk = dedupedTickets.slice(i, i + CACHE_UPSERT_CHUNK_SIZE);

    let attempt = 1;
    for (;;) {
      try {
        await prisma.$transaction(
          chunk.map((ticket) => {
            const data = toCacheUpsertInput(ticket, eventType);
            return prisma.zammadTicketCache.upsert({
              where: { zammadTicketId: ticket.id },
              create: data,
              update: data,
            });
          })
        );
        break;
      } catch (error) {
        if (attempt >= CACHE_UPSERT_MAX_RETRIES) throw error;
        await new Promise((resolve) => setTimeout(resolve, 150 * attempt));
        attempt += 1;
      }
    }
  }
}

export async function listCachedTickets(input: {
  role: Role;
  email: string;
  scopedEmails?: string[];
  page: number;
  pageSize: number;
  queue?: QueueKey;
  zammadUserId?: number | null;
  search?: string;
  statusGroup?: TicketStatusGroup | "all";
}): Promise<{ rows: ZammadTicketCache[]; total: number }> {
  const where: Prisma.ZammadTicketCacheWhereInput = {};

  if (!SYSTEM_ROLES.has(input.role)) {
    const emails = input.scopedEmails?.length ? input.scopedEmails : [input.email];
    where.OR = emails.map((value) => ({
      customer: { contains: value, mode: "insensitive" },
    }));
  }

  if (input.queue === "my_queue") {
    if (input.zammadUserId) {
      where.ownerId = input.zammadUserId;
    } else {
      where.zammadTicketId = -1;
    }
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

  const search = input.search?.trim();
  if (search) {
    const searchConditions: Prisma.ZammadTicketCacheWhereInput[] = [
      { number: { contains: search, mode: "insensitive" } },
      { title: { contains: search, mode: "insensitive" } },
    ];

    if (SYSTEM_ROLES.has(input.role)) {
      searchConditions.push({ customer: { contains: search, mode: "insensitive" } });
    }

    const existingAnd = where.AND
      ? Array.isArray(where.AND)
        ? where.AND
        : [where.AND]
      : [];

    where.AND = [...existingAnd, { OR: searchConditions }];
  }

  if (input.statusGroup && input.statusGroup !== "all") {
    where.stateId = { in: [...getStateIdsForStatusGroup(input.statusGroup)] };
  } else {
    where.stateId = { in: Array.from(new Set([...OPERATIONAL_STATE_IDS, ...CLOSED_STATE_IDS])) };
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
