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
    const teamLabel = this.ticketHistoryService.formatTicketTeamLabel(input.team);
    const resourceLines = [
      input.databaseUrl ? `Base de Dados: ${input.databaseUrl}` : undefined,
      input.developmentVideoUrl ? `Video: ${input.developmentVideoUrl}` : undefined,
      ticketUrl ? `Link: ${ticketUrl}` : undefined,
    ].filter(Boolean);
    const message = [
      '[Tickets] Abertura',
      categoryLabel
        ? `Ticket: ${input.ticketNumber} | Status: Abertura | Setor: ${teamLabel} | Categoria: ${categoryLabel}`
        : `Ticket: ${input.ticketNumber} | Status: Abertura | Setor: ${teamLabel}`,
      `Empresa: ${companyName}${companyCnpj ? ` (${companyCnpj})` : ''}`,
      '',
      `Titulo: ${input.title}`,
      ...(resourceLines.length ? ['', 'Recursos para Analise', ...resourceLines] : []),
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
    note?: string | null;
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
      input.notificationType === 'testing' ? '[Tickets] Em testes' : '[Tickets] Retorno dos Testes',
      `Estagio: ${statusLabel}`,
      `Ticket: ${input.ticketNumber}`,
      `Empresa: ${companyName}`,
      `Titulo: ${input.title}`,
      input.notificationType === 'testing_failed' && input.note?.trim() ? `Motivo: ${input.note.trim()}` : undefined,
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
    const configuredOrigins = [
      process.env.PORTAL_URL,
      process.env.NEXT_PUBLIC_WEB_URL,
      process.env.NEXT_PUBLIC_APP_URL,
      process.env.WEB_URL,
      process.env.FRONTEND_URL,
      process.env.APP_URL,
    ];

    for (const configuredOrigin of configuredOrigins) {
      const normalized = this.normalizeOrigin(configuredOrigin);
      if (!normalized) continue;
      return `${normalized}/portal/tickets/${ticketId}`;
    }

    const explicitOrigin = this.readHeader(rawHeaders, 'x-portal-origin') || this.readHeader(rawHeaders, 'origin');
    if (explicitOrigin) {
      const normalized = this.normalizeOrigin(explicitOrigin);
      if (normalized) return `${normalized}/portal/tickets/${ticketId}`;
    }

    const host = this.readHeader(rawHeaders, 'x-forwarded-host') || this.readHeader(rawHeaders, 'host');
    if (!host) return null;

    const protocol = this.readHeader(rawHeaders, 'x-forwarded-proto') || 'https';
    const inferredOrigin = this.normalizeOrigin(`${protocol}://${host}`);
    return inferredOrigin ? `${inferredOrigin}/portal/tickets/${ticketId}` : null;
  }

  private readHeader(rawHeaders: IncomingHttpHeaders | undefined, key: string): string | null {
    const header = rawHeaders?.[key];
    if (Array.isArray(header)) {
      return header[0]?.trim() || null;
    }
    return typeof header === 'string' && header.trim() ? header.trim() : null;
  }

  private normalizeOrigin(value?: string | null): string | null {
    const trimmed = value?.trim();
    if (!trimmed) return null;

    try {
      return new URL(trimmed).origin;
    } catch {
      this.logger.warn(`Origem invalida ignorada ao montar link de ticket: ${trimmed}`);
      return null;
    }
  }
}
