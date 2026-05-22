import { Injectable } from '@nestjs/common';
import type { TicketModuleSettings, TicketModuleTriageRequest } from '@dosc-syspro/contracts/ticket';
import { ConversationPriority as TicketPriority, ConversationStatus as TicketStatus } from '@prisma/client';
import {
  mapStatusLabel,
  formatTeamLabel,
  readMetadataString,
  resolveCategoryLabel,
  formatPriorityLabel,
  buildAssignmentBody,
  buildTriageBody,
  buildUpdateBody,
} from '@dosc-syspro/tickets-domain';

@Injectable()
export class TicketHistoryService {
  resolveCategoryLabel(settings: TicketModuleSettings, category?: string | null): string | null {
    return resolveCategoryLabel(settings, category);
  }

  formatTicketTeamLabel(team?: string | null): string {
    return formatTeamLabel(team);
  }

  formatTicketPriorityLabel(settings: TicketModuleSettings, priority?: TicketPriority | null): string {
    return formatPriorityLabel(settings, priority ?? undefined);
  }

  readMetadataString(metadata: Record<string, unknown>, key: string): string | null {
    return readMetadataString(metadata, key);
  }

  formatTicketStatusLabel(status: TicketStatus): string {
    return mapStatusLabel(status);
  }

  buildAssignmentBody(input: { requesterName: string; currentTeam: string | null }): string {
    return buildAssignmentBody(input);
  }

  buildTriageBody(input: {
    requesterName: string;
    settings: TicketModuleSettings;
    triage: TicketModuleTriageRequest;
    resolvedTeam?: 'SUPORTE' | 'DESENVOLVIMENTO';
  }): string {
    return buildTriageBody(input);
  }

  buildUpdateBody(input: {
    requesterDisplayName: string;
    settings: TicketModuleSettings;
    previousTeam: string | null;
    nextTeam: string | null;
    previousStatus: TicketStatus;
    nextStatus: TicketStatus;
    previousCategory: string | null;
    nextCategory: string | null;
    previousPriority: TicketPriority;
    nextPriority: TicketPriority;
    previousCurrentOwnerName: string | null;
    nextCurrentOwnerName: string | null;
    previousSupportOwnerName: string | null;
    nextSupportOwnerName: string | null;
    previousDevelopmentOwnerName: string | null;
    nextDevelopmentOwnerName: string | null;
    previousPublishToReleases: boolean;
    nextPublishToReleases: boolean;
    previousReleaseTitle: string | null;
    nextReleaseTitle: string | null;
    previousReleaseModule: string | null;
    nextReleaseModule: string | null;
    previousReleaseType: string | null;
    nextReleaseType: string | null;
    previousResolutionSummary: string | null;
    nextResolutionSummary: string | null;
    handoffNote?: string;
  }): string | null {
    return buildUpdateBody(input);
  }
}
