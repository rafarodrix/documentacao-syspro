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

    const markedTickets = tickets.filter((ticket) => ticket.publishToReleases === true);
    const developmentTickets = markedTickets.filter((ticket) => this.isDevelopmentReleaseTicket(ticket.metadata));
    const summarizedTickets = developmentTickets.filter((ticket) => Boolean(ticket.resolutionSummary?.trim()));
    const releases = summarizedTickets
      .map(buildReleaseFromTicket)
      .filter((release): release is Release => Boolean(release));

    this.logger.debug(
      JSON.stringify({
        stage: 'release_projection_diagnostics',
        totalResolvedTickets: tickets.length,
        markedForPublishTickets: markedTickets.length,
        developmentMarkedTickets: developmentTickets.length,
        developmentMarkedWithSummaryTickets: summarizedTickets.length,
        projectedReleases: releases.length,
        excludedByPublishFlag: tickets.length - markedTickets.length,
        excludedByTeam: markedTickets.length - developmentTickets.length,
        excludedBySummary: developmentTickets.length - summarizedTickets.length,
        excludedByProjection: summarizedTickets.length - releases.length,
        samplesExcludedByPublishFlag: tickets
          .filter((ticket) => ticket.publishToReleases !== true)
          .slice(0, 5)
          .map((ticket) => ({
            id: ticket.id,
            ticketNumber: ticket.ticketNumber,
            publishToReleases: ticket.publishToReleases,
            currentTeam: readReleaseMetadataString(ticket.metadata, 'currentTeam'),
            hasSummary: Boolean(ticket.resolutionSummary?.trim()),
          })),
        samplesExcludedByTeam: markedTickets
          .filter((ticket) => !this.isDevelopmentReleaseTicket(ticket.metadata))
          .slice(0, 5)
          .map((ticket) => ({
            id: ticket.id,
            ticketNumber: ticket.ticketNumber,
            status: ticket.status,
            publishToReleases: ticket.publishToReleases,
            currentTeam: readReleaseMetadataString(ticket.metadata, 'currentTeam'),
          })),
        samplesExcludedBySummary: developmentTickets
          .filter((ticket) => !ticket.resolutionSummary?.trim())
          .slice(0, 5)
          .map((ticket) => ({
            id: ticket.id,
            ticketNumber: ticket.ticketNumber,
            currentTeam: readReleaseMetadataString(ticket.metadata, 'currentTeam'),
            resolutionSummary: ticket.resolutionSummary,
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
