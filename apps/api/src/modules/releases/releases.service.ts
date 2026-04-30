import { Injectable, Logger } from '@nestjs/common';
import { ConversationStatus as TicketStatus } from '@prisma/client';
import { buildReleaseFromTicket, readReleaseMetadataString, type Release } from '@dosc-syspro/core';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ReleasesService {
  private readonly logger = new Logger(ReleasesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<{ success: true; data: Release[] }> {
    const tickets = await this.prisma.conversation.findMany({
      where: {
        publishToReleases: true,
        resolutionSummary: { not: null },
        status: TicketStatus.RESOLVED,
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
        status: true,
        metadata: true,
        closedAt: true,
        updatedAt: true,
      },
    });

    const developmentTickets = tickets.filter((ticket) => this.isDevelopmentReleaseTicket(ticket.metadata));
    const projectedCandidates = developmentTickets.filter((ticket) => Boolean(buildReleaseFromTicket(ticket)));
    const releases = developmentTickets
      .map(buildReleaseFromTicket)
      .filter((release): release is Release => Boolean(release));

    this.logger.debug(
      JSON.stringify({
        stage: 'release_projection_diagnostics',
        totalResolvedMarkedTickets: tickets.length,
        developmentResolvedMarkedTickets: developmentTickets.length,
        projectedReleases: releases.length,
        excludedByTeam: tickets.length - developmentTickets.length,
        excludedByProjection: developmentTickets.length - projectedCandidates.length,
        samplesExcludedByTeam: tickets
          .filter((ticket) => !this.isDevelopmentReleaseTicket(ticket.metadata))
          .slice(0, 5)
          .map((ticket) => ({
            id: ticket.id,
            ticketNumber: ticket.ticketNumber,
            status: ticket.status,
            publishToReleases: ticket.publishToReleases,
            currentTeam: readReleaseMetadataString(ticket.metadata, 'currentTeam'),
          })),
      }),
    );

    return { success: true, data: releases };
  }

  private isDevelopmentReleaseTicket(metadata: unknown) {
    const currentTeam = readReleaseMetadataString(metadata, 'currentTeam');
    return currentTeam?.trim().toUpperCase() === 'DESENVOLVIMENTO';
  }
}
