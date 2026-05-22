import type { PrismaClient, Prisma } from '@prisma/client';

type PrismaLike = Pick<PrismaClient, 'ticket' | 'conversationMessage'>;

export function withTicketTeam(
  where: Prisma.TicketWhereInput,
  team: 'SUPORTE' | 'DESENVOLVIMENTO',
): Prisma.TicketWhereInput {
  return {
    ...where,
    AND: [
      ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
      { metadata: { path: ['currentTeam'], equals: team } },
    ],
  };
}

export async function findTicketDetail(
  prisma: PrismaLike,
  id: string,
  page: number,
  pageSize: number,
) {
  const skip = (page - 1) * pageSize;
  return (prisma as PrismaClient).$transaction([
    prisma.ticket.findUnique({
      where: { id },
      include: {
        company: { select: { id: true, razaoSocial: true, nomeFantasia: true } },
        companyContact: { select: { id: true, name: true, email: true, whatsapp: true } },
        assignedUser: { select: { id: true, name: true, email: true } },
        resolvedByUser: { select: { id: true, name: true, email: true } },
        messages: {
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          skip,
          take: pageSize,
          include: {
            attachments: { orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] },
            authorUser: { select: { id: true, name: true, email: true } },
            authorContact: { select: { id: true, name: true } },
          },
        },
      },
    }),
    prisma.conversationMessage.count({ where: { conversationId: id } }),
  ]);
}

export async function listTicketPage(
  prisma: PrismaLike,
  where: Prisma.TicketWhereInput,
  skip: number,
  take: number,
  orderBy: Prisma.TicketOrderByWithRelationInput[],
) {
  return prisma.ticket.findMany({
    where,
    orderBy,
    skip,
    take,
    include: {
      company: { select: { id: true, razaoSocial: true, nomeFantasia: true } },
      companyContact: { select: { id: true, name: true, email: true, whatsapp: true } },
      assignedUser: { select: { id: true, name: true, email: true } },
    },
  });
}

export async function countTicketQueues(
  prisma: PrismaLike,
  params: {
    where: Prisma.TicketWhereInput;
    queueBaseWhere: Prisma.TicketWhereInput;
    openStatusWhere: Prisma.TicketWhereInput;
    developmentStatusWhere: Prisma.TicketWhereInput;
    testingStatusWhere: Prisma.TicketWhereInput;
    closedStatusWhere: Prisma.TicketWhereInput;
    requesterUserId: string;
  },
) {
  const { where, queueBaseWhere, openStatusWhere, developmentStatusWhere, testingStatusWhere, closedStatusWhere, requesterUserId } = params;
  const [total, baseTotal, openCount, developmentCount, testingCount, closedCount, myQueueCount, unassignedCount, criticalCount, noResponseCount] =
    await Promise.all([
      prisma.ticket.count({ where }),
      prisma.ticket.count({ where: queueBaseWhere }),
      prisma.ticket.count({ where: openStatusWhere }),
      prisma.ticket.count({ where: developmentStatusWhere }),
      prisma.ticket.count({ where: testingStatusWhere }),
      prisma.ticket.count({ where: closedStatusWhere }),
      prisma.ticket.count({ where: { ...queueBaseWhere, assignedUserId: requesterUserId } }),
      prisma.ticket.count({ where: { ...queueBaseWhere, assignedUserId: null } }),
      prisma.ticket.count({ where: { ...queueBaseWhere, priority: 'CRITICAL' } }),
      prisma.ticket.count({
        where: { ...queueBaseWhere, slaResponseHitAt: null, status: { notIn: ['RESOLVED', 'ARCHIVED'] } },
      }),
    ]);

  return { total, baseTotal, openCount, developmentCount, testingCount, closedCount, myQueueCount, unassignedCount, criticalCount, noResponseCount };
}
