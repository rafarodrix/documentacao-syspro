import { Prisma, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { CLOSED_STATE_IDS, OPERATIONAL_STATE_IDS, type QueueKey, type TicketStatusGroup } from "@dosc-syspro/core";
import { getStateIdsForStatusGroup } from "@dosc-syspro/core";
import type { TicketStatusCounts } from "@/components/platform/tickets/types";
import { isSystemRole } from "./ticket-scope.service";

export function buildCacheWhere(input: {
  role: Role;
  email: string;
  scopedEmails: string[];
  queue: QueueKey;
  zammadUserId: number | null;
  search?: string;
  statusGroup?: TicketStatusGroup | "all";
}): Prisma.ZammadTicketCacheWhereInput {
  const where: Prisma.ZammadTicketCacheWhereInput = {};

  if (!isSystemRole(input.role)) {
    const emails = input.scopedEmails.length ? input.scopedEmails : [input.email];
    where.OR = emails.map((value) => ({
      customer: { contains: value, mode: "insensitive" },
    }));
  }

  const search = (input.search || "").replace(/["\\]/g, "").trim();
  if (search) {
    const searchConditions: Prisma.ZammadTicketCacheWhereInput[] = [
      { number: { contains: search, mode: "insensitive" } },
      { title: { contains: search, mode: "insensitive" } },
    ];
    if (isSystemRole(input.role)) {
      searchConditions.push({ customer: { contains: search, mode: "insensitive" } });
    }
    const existingAnd = where.AND
      ? Array.isArray(where.AND)
        ? where.AND
        : [where.AND]
      : [];

    where.AND = [...existingAnd, { OR: searchConditions }];
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

  if (input.statusGroup && input.statusGroup !== "all") {
    where.stateId = { in: [...getStateIdsForStatusGroup(input.statusGroup)] };
  } else {
    where.stateId = { in: Array.from(new Set([...OPERATIONAL_STATE_IDS, ...CLOSED_STATE_IDS])) };
  }

  return where;
}

export async function getQueueCountsFromCache(input: {
  role: Role;
  email: string;
  scopedEmails: string[];
  zammadUserId: number | null;
  search?: string;
}): Promise<Record<QueueKey, number>> {
  const [all, myQueue, unassigned, critical, noResponse] = await Promise.all([
    prisma.zammadTicketCache.count({
      where: buildCacheWhere({ ...input, queue: "all", statusGroup: "all" }),
    }),
    input.zammadUserId
      ? prisma.zammadTicketCache.count({
          where: buildCacheWhere({ ...input, queue: "my_queue", statusGroup: "all" }),
        })
      : Promise.resolve(0),
    prisma.zammadTicketCache.count({
      where: buildCacheWhere({ ...input, queue: "unassigned", statusGroup: "all" }),
    }),
    prisma.zammadTicketCache.count({
      where: buildCacheWhere({ ...input, queue: "critical", statusGroup: "all" }),
    }),
    prisma.zammadTicketCache.count({
      where: buildCacheWhere({ ...input, queue: "no_response", statusGroup: "all" }),
    }),
  ]);

  return {
    all,
    my_queue: myQueue,
    unassigned,
    critical,
    no_response: noResponse,
  };
}

export async function getStatusCountsFromCache(input: {
  role: Role;
  email: string;
  scopedEmails: string[];
  zammadUserId: number | null;
  queue: QueueKey;
  search?: string;
}): Promise<TicketStatusCounts> {
  const [open, pending, closed] = await Promise.all([
    prisma.zammadTicketCache.count({
      where: buildCacheWhere({ ...input, statusGroup: "open" }),
    }),
    prisma.zammadTicketCache.count({
      where: buildCacheWhere({ ...input, statusGroup: "pending" }),
    }),
    prisma.zammadTicketCache.count({
      where: buildCacheWhere({ ...input, statusGroup: "closed" }),
    }),
  ]);

  return { open, pending, closed };
}
