import { Injectable } from '@nestjs/common';
import { ConversationStatus as TicketStatus } from '@prisma/client';
import { buildReleaseFromTicket, type Release } from '@dosc-syspro/core';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ReleasesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<{ success: true; data: Release[] }> {
    const tickets = await this.prisma.conversation.findMany({
      where: {
        publishToReleases: true,
        resolutionSummary: { not: null },
        status: { in: [TicketStatus.RESOLVED, TicketStatus.ARCHIVED] },
      },
      orderBy: [{ closedAt: 'desc' }, { updatedAt: 'desc' }],
      select: {
        id: true,
        ticketNumber: true,
        subject: true,
        resolutionSummary: true,
        resolutionVideoUrl: true,
        releaseType: true,
        releaseModule: true,
        publishToReleases: true,
        metadata: true,
        closedAt: true,
        updatedAt: true,
      },
    });

    const releases = tickets
      .map(buildReleaseFromTicket)
      .filter((release): release is Release => Boolean(release));

    return { success: true, data: releases };
  }
}
