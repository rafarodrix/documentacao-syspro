import type { PrismaClient, Prisma } from '@prisma/client';

type PrismaLike = Pick<PrismaClient, 'conversation' | 'conversationMessage'>;

export function withTicketTeam(
  where: Prisma.ConversationWhereInput,
  team: 'SUPORTE' | 'DESENVOLVIMENTO',
): Prisma.ConversationWhereInput {
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
    prisma.conversation.findUnique({
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
  where: Prisma.ConversationWhereInput,
  skip: number,
  take: number,
  orderBy: Prisma.ConversationOrderByWithRelationInput[],
) {
  return prisma.conversation.findMany({
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
    where: Prisma.ConversationWhereInput;
    queueBaseWhere: Prisma.ConversationWhereInput;
    openStatusWhere: Prisma.ConversationWhereInput;
    developmentStatusWhere: Prisma.ConversationWhereInput;
    testingStatusWhere: Prisma.ConversationWhereInput;
    closedStatusWhere: Prisma.ConversationWhereInput;
    requesterUserId: string;
  },
) {
  const { where, queueBaseWhere, openStatusWhere, developmentStatusWhere, testingStatusWhere, closedStatusWhere, requesterUserId } = params;
  const [total, baseTotal, openCount, developmentCount, testingCount, closedCount, myQueueCount, unassignedCount, criticalCount, noResponseCount] =
    await Promise.all([
      prisma.conversation.count({ where }),
      prisma.conversation.count({ where: queueBaseWhere }),
      prisma.conversation.count({ where: openStatusWhere }),
      prisma.conversation.count({ where: developmentStatusWhere }),
      prisma.conversation.count({ where: testingStatusWhere }),
      prisma.conversation.count({ where: closedStatusWhere }),
      prisma.conversation.count({ where: { ...queueBaseWhere, assignedUserId: requesterUserId } }),
      prisma.conversation.count({ where: { ...queueBaseWhere, assignedUserId: null } }),
      prisma.conversation.count({ where: { ...queueBaseWhere, priority: 'CRITICAL' } }),
      prisma.conversation.count({
        where: { ...queueBaseWhere, slaResponseHitAt: null, status: { notIn: ['RESOLVED', 'ARCHIVED'] } },
      }),
    ]);

  return { total, baseTotal, openCount, developmentCount, testingCount, closedCount, myQueueCount, unassignedCount, criticalCount, noResponseCount };
}
