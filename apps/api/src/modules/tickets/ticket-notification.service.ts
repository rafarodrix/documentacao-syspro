import { Injectable, Logger } from '@nestjs/common';
import type { TicketModuleSettings } from '@dosc-syspro/contracts/ticket';
import { PrismaService } from '../../prisma/prisma.service';
import { EvolutionClient } from '../integrations/evolution/evolution.client';
import { IntegrationContextService } from '../settings/integration-context.service';
import type { IncomingHttpHeaders } from 'node:http';
import { TicketHistoryService } from './ticket-history.service';
import { ConversationStatus as TicketStatus } from '@prisma/client';

@Injectable()
export class TicketNotificationService {
  private readonly logger = new Logger(TicketNotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly evolutionClient: EvolutionClient,
    private readonly integrationContext: IntegrationContextService,
    private readonly ticketHistoryService: TicketHistoryService,
  ) {}

  async sendTicketCreatedGroupNotification(input: {
    settings: TicketModuleSettings;
    ticketId: string;
    ticketNumber: string;
    title: string;
    team: 'SUPORTE' | 'DESENVOLVIMENTO';
    category: string | null;
    companyId: string | null;
    databaseUrl: string | null;
    developmentVideoUrl: string | null;
    rawHeaders?: IncomingHttpHeaders;
  }) {
    const configuredGroups =
      input.team === 'DESENVOLVIMENTO'
        ? input.settings.developmentNotificationGroups
        : input.settings.supportNotificationGroups;
    const targetGroups = configuredGroups
      .filter((group) => group.active)
      .map((group) => ({
        ...group,
        jid: this.normalizeGroupRecipient(group.jid),
      }))
      .filter((group): group is { id: string; label: string; jid: string; active: boolean } => Boolean(group.jid));

    if (!targetGroups.length) {
      this.logger.debug(JSON.stringify({
        flow: 'portal_to_evolution',
        stage: 'ticket_group_notification_skipped_no_group',
        ticketId: input.ticketId,
        ticketNumber: input.ticketNumber,
        team: input.team,
      }));
      return;
    }

    const connection = await this.integrationContext.getDefaultContext();
    if (!connection) {
      this.logger.warn(JSON.stringify({
        flow: 'portal_to_evolution',
        stage: 'ticket_group_notification_skipped_no_connection',
        ticketId: input.ticketId,
        ticketNumber: input.ticketNumber,
        team: input.team,
        groupCount: targetGroups.length,
      }));
      return;
    }

    const company = input.companyId
      ? await this.prisma.company.findUnique({
          where: { id: input.companyId },
          select: {
            nomeFantasia: true,
            razaoSocial: true,
            cnpj: true,
          },
        })
      : null;

    const companyName = company?.nomeFantasia?.trim() || company?.razaoSocial?.trim() || 'Empresa nao informada';
    const companyCnpj = this.formatCnpj(company?.cnpj);
    const ticketUrl = this.buildPortalTicketUrl(input.ticketId, input.rawHeaders);
    const categoryLabel = this.ticketHistoryService.resolveCategoryLabel(input.settings, input.category);
    const message = [
      '[Tickets] Abertura',
      `Ticket: ${input.ticketNumber}`,
      `Empresa: ${companyName}`,
      `Titulo: ${input.title}`,
      `Fila: ${this.ticketHistoryService.formatTicketTeamLabel(input.team)}`,
      categoryLabel ? `Categoria: ${categoryLabel}` : undefined,
      companyCnpj ? `CNPJ: ${companyCnpj}` : undefined,
      input.developmentVideoUrl ? `Video: ${input.developmentVideoUrl}` : undefined,
      input.databaseUrl ? `Base: ${input.databaseUrl}` : undefined,
      ticketUrl ? `Link: ${ticketUrl}` : undefined,
    ]
      .filter(Boolean)
      .join('\n');

    await this.dispatchToGroups(targetGroups, connection.evolution, message, {
      flow: 'portal_to_evolution',
      sentStage: 'ticket_group_notification_sent',
      failedStage: 'ticket_group_notification_failed',
      ticketId: input.ticketId,
      ticketNumber: input.ticketNumber,
      team: input.team,
    });
  }

  async sendTicketStatusGroupNotification(input: {
    settings: TicketModuleSettings;
    ticketId: string;
    ticketNumber: string;
    title: string;
    companyId: string | null;
    status: 'TESTING' | 'IN_PROGRESS';
    notificationType: 'testing' | 'testing_failed';
    rawHeaders?: IncomingHttpHeaders;
  }) {
    const configuredGroups =
      input.notificationType === 'testing'
        ? input.settings.testingNotificationGroups
        : input.settings.testingFailedNotificationGroups;
    const targetGroups = configuredGroups
      .filter((group) => group.active)
      .map((group) => ({
        ...group,
        jid: this.normalizeGroupRecipient(group.jid),
      }))
      .filter((group): group is { id: string; label: string; jid: string; active: boolean } => Boolean(group.jid));

    if (!targetGroups.length) {
      this.logger.debug(JSON.stringify({
        flow: 'portal_to_evolution',
        stage: 'ticket_status_notification_skipped_no_group',
        ticketId: input.ticketId,
        ticketNumber: input.ticketNumber,
        notificationType: input.notificationType,
        status: input.status,
      }));
      return;
    }

    const connection = await this.integrationContext.getDefaultContext();
    if (!connection) {
      this.logger.warn(JSON.stringify({
        flow: 'portal_to_evolution',
        stage: 'ticket_status_notification_skipped_no_connection',
        ticketId: input.ticketId,
        ticketNumber: input.ticketNumber,
        notificationType: input.notificationType,
        status: input.status,
        groupCount: targetGroups.length,
      }));
      return;
    }

    const company = input.companyId
      ? await this.prisma.company.findUnique({
          where: { id: input.companyId },
          select: {
            nomeFantasia: true,
            razaoSocial: true,
          },
        })
      : null;

    const companyName = company?.nomeFantasia?.trim() || company?.razaoSocial?.trim() || 'Empresa nao informada';
    const ticketUrl = this.buildPortalTicketUrl(input.ticketId, input.rawHeaders);
    const statusLabel = this.ticketHistoryService.formatTicketStatusLabel(input.status as TicketStatus);
    const message = [
      input.notificationType === 'testing' ? '[Tickets] Em testes' : '[Tickets] Retorno dos testes',
      `Estagio: ${statusLabel}`,
      `Ticket: ${input.ticketNumber}`,
      `Empresa: ${companyName}`,
      `Titulo: ${input.title}`,
      ticketUrl ? `Link: ${ticketUrl}` : undefined,
    ]
      .filter(Boolean)
      .join('\n');

    await this.dispatchToGroups(targetGroups, connection.evolution, message, {
      flow: 'portal_to_evolution',
      sentStage: 'ticket_status_notification_sent',
      failedStage: 'ticket_status_notification_failed',
      ticketId: input.ticketId,
      ticketNumber: input.ticketNumber,
      notificationType: input.notificationType,
      status: input.status,
    });
  }

  private async dispatchToGroups(
    groups: Array<{ id: string; label: string; jid: string; active: boolean }>,
    evolution: unknown,
    message: string,
    baseLog: Record<string, unknown>,
  ) {
    for (const group of groups) {
      try {
        await this.evolutionClient.sendTextMessage(evolution as never, group.jid, message);
        this.logger.log(JSON.stringify({
          ...baseLog,
          stage: baseLog.sentStage,
          groupJid: group.jid,
          groupLabel: group.label,
        }));
      } catch (error: any) {
        this.logger.warn(JSON.stringify({
          ...baseLog,
          stage: baseLog.failedStage,
          groupJid: group.jid,
          groupLabel: group.label,
          error: error?.message ?? 'unknown_error',
        }));
      }
    }
  }

  private normalizeGroupRecipient(value?: string | null): string | null {
    const normalized = String(value ?? '').trim();
    if (!normalized) return null;
    if (normalized.endsWith('@g.us')) return normalized;

    const digits = normalized.replace(/\D/g, '');
    return digits ? `${digits}@g.us` : null;
  }

  private formatCnpj(value?: string | null): string | null {
    const digits = String(value ?? '').replace(/\D/g, '');
    if (digits.length !== 14) return null;
    return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  }

  private buildPortalTicketUrl(ticketId: string, rawHeaders?: IncomingHttpHeaders): string | null {
    const explicitOrigin = this.readHeader(rawHeaders, 'x-portal-origin') || this.readHeader(rawHeaders, 'origin');
    if (explicitOrigin) {
      try {
        return `${new URL(explicitOrigin).origin}/portal/tickets/${ticketId}`;
      } catch {
        return null;
      }
    }

    const host = this.readHeader(rawHeaders, 'x-forwarded-host') || this.readHeader(rawHeaders, 'host');
    if (!host) return null;

    const protocol = this.readHeader(rawHeaders, 'x-forwarded-proto') || 'https';
    try {
      return `${new URL(`${protocol}://${host}`).origin}/portal/tickets/${ticketId}`;
    } catch {
      return null;
    }
  }

  private readHeader(rawHeaders: IncomingHttpHeaders | undefined, key: string): string | null {
    const header = rawHeaders?.[key];
    if (Array.isArray(header)) {
      return header[0]?.trim() || null;
    }
    return typeof header === 'string' && header.trim() ? header.trim() : null;
  }
}
