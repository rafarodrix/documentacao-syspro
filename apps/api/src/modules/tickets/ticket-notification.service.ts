import { Injectable, Logger } from '@nestjs/common';
import type { IncomingHttpHeaders } from 'node:http';
import type { TicketModuleSettings } from '@dosc-syspro/contracts/ticket';
import { AutomationWhatsappService } from '../automation/automation-whatsapp.service';

@Injectable()
export class TicketNotificationService {
  private readonly logger = new Logger(TicketNotificationService.name);

  constructor(private readonly automationWhatsappService: AutomationWhatsappService) {}

  sendTicketCreatedGroupNotification(payload: {
    settings: TicketModuleSettings;
    ticketId: string;
    ticketNumber: string;
    title: string;
    team: string;
    category: string | null;
    companyId: string | null;
    databaseUrl: string | null;
    developmentVideoUrl: string | null;
    rawHeaders?: IncomingHttpHeaders;
  }) {
    this.runAutomationInBackground('ticket_created_group_notification', payload.ticketId, async () => {
      await this.automationWhatsappService.sendTicketCreatedGroupNotification({
        settings: payload.settings,
        ticketId: payload.ticketId,
        ticketNumber: payload.ticketNumber,
        title: payload.title,
        team: payload.team as 'SUPORTE' | 'DESENVOLVIMENTO',
        category: payload.category,
        companyId: payload.companyId,
        databaseUrl: payload.databaseUrl,
        developmentVideoUrl: payload.developmentVideoUrl,
        rawHeaders: payload.rawHeaders,
      });
    });
  }

  sendTicketTeamRoutingGroupNotifications(payload: {
    settings: TicketModuleSettings;
    ticketId: string;
    ticketNumber: string;
    title: string;
    companyId: string | null;
    previousTeam: 'SUPORTE' | 'DESENVOLVIMENTO';
    nextTeam: 'SUPORTE' | 'DESENVOLVIMENTO';
    note?: string;
    rawHeaders?: IncomingHttpHeaders;
  }) {
    this.runAutomationInBackground('ticket_team_routing_group_notification', payload.ticketId, async () => {
      await this.automationWhatsappService.sendTicketTeamRoutingGroupNotifications({
        settings: payload.settings,
        ticketId: payload.ticketId,
        ticketNumber: payload.ticketNumber,
        title: payload.title,
        companyId: payload.companyId,
        previousTeam: payload.previousTeam,
        nextTeam: payload.nextTeam,
        note: payload.note,
        rawHeaders: payload.rawHeaders,
      });
    });
  }

  sendTicketStatusGroupNotification(payload: {
    settings: TicketModuleSettings;
    ticketId: string;
    ticketNumber: string;
    title: string;
    companyId: string | null;
    status: 'IN_PROGRESS' | 'TESTING';
    notificationType: 'testing' | 'testing_failed';
    note?: string;
    rawHeaders?: IncomingHttpHeaders;
  }) {
    this.runAutomationInBackground('ticket_status_group_notification', payload.ticketId, async () => {
      await this.automationWhatsappService.sendTicketStatusGroupNotification({
        settings: payload.settings,
        ticketId: payload.ticketId,
        ticketNumber: payload.ticketNumber,
        title: payload.title,
        companyId: payload.companyId,
        status: payload.status,
        notificationType: payload.notificationType,
        note: payload.note,
        rawHeaders: payload.rawHeaders,
      });
    });
  }

  sendReleasePublishedNotification(payload: {
    settings: TicketModuleSettings;
    ticketId: string;
    ticketNumber: string;
    title: string;
    summary: string;
    releaseType: string | null;
    companyId: string | null;
    publishedAt: Date | null;
    rawHeaders?: IncomingHttpHeaders;
  }) {
    this.runAutomationInBackground('release_published_notification', payload.ticketId, async () => {
      await this.automationWhatsappService.sendReleasePublishedNotification({
        settings: payload.settings,
        ticketId: payload.ticketId,
        ticketNumber: payload.ticketNumber,
        title: payload.title,
        summary: payload.summary,
        releaseType: payload.releaseType,
        companyId: payload.companyId,
        publishedAt: payload.publishedAt,
        rawHeaders: payload.rawHeaders,
      });
    });
  }

  private runAutomationInBackground(
    automationName: string,
    ticketId: string,
    task: () => Promise<void>,
  ) {
    void Promise.resolve()
      .then(task)
      .catch((error: any) => {
        this.logger.error(JSON.stringify({
          flow: 'portal_to_automation',
          stage: 'background_automation_failed',
          automationName,
          ticketId,
          error: error?.message ?? 'unknown_error',
        }));
      });
  }
}
