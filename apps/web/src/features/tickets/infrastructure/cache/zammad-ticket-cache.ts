import { Prisma, Role, ZammadTicketCache } from "@prisma/client";
import { ZammadOperationalTicket } from "@dosc-syspro/contracts";
import { prisma } from "@/lib/prisma";
import { computeTicketSla } from "@dosc-syspro/core";
import type { QueueKey, TicketStatusGroup } from "@dosc-syspro/core";
import type { ClosedTicketsWindow } from "@/features/tickets/domain/model";
import { buildCacheWhere } from "@/features/tickets/application/services/ticket-query-counts.service";

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

  // Sort by ID to mathematically prevent PostgreSQL distributed deadlocks during concurrent chunk UPSERTS
  const dedupedTickets = Array.from(newestByTicketId.values()).sort((a, b) => a.id - b.id);

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
  closedWindow?: ClosedTicketsWindow;
}): Promise<{ rows: ZammadTicketCache[]; total: number }> {
  const where: Prisma.ZammadTicketCacheWhereInput = buildCacheWhere({
    role: input.role,
    email: input.email,
    scopedEmails: input.scopedEmails ?? [],
    queue: input.queue ?? "all",
    zammadUserId: input.zammadUserId ?? null,
    search: input.search,
    statusGroup: input.statusGroup,
    closedWindow: input.closedWindow,
  });

  const [rows, total] = await prisma.$transaction([
    prisma.zammadTicketCache.findMany({
      where,
      orderBy: input.statusGroup === "closed"
        ? [{ resolvedAt: "desc" }, { updatedAtZammad: "desc" }]
        : [{ updatedAtZammad: "desc" }],
      skip: (input.page - 1) * input.pageSize,
      take: input.pageSize,
    }),
    prisma.zammadTicketCache.count({ where }),
  ]);

  return { rows, total };
}

export async function getLatestOperationalTicketCacheFreshness(): Promise<{
  hasCache: boolean;
  staleMinutes: number | null;
}> {
  const latest = await prisma.zammadTicketCache.findFirst({
    orderBy: [{ lastSyncedAt: "desc" }, { updatedAtZammad: "desc" }],
    select: { lastSyncedAt: true, updatedAtZammad: true },
  });

  if (!latest) {
    return { hasCache: false, staleMinutes: null };
  }

  const referenceDate = latest.lastSyncedAt ?? latest.updatedAtZammad;
  const staleMinutes = Math.max(0, Math.floor((Date.now() - referenceDate.getTime()) / 60000));

  return {
    hasCache: true,
    staleMinutes,
  };
}
