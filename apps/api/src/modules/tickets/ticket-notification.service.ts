import { Injectable, Logger } from '@nestjs/common';
import type { TicketModuleSettings } from '@dosc-syspro/contracts/ticket';
import { PrismaService } from '../../prisma/prisma.service';
import { EvolutionClient } from '../integrations/evolution/evolution.client';
import { IntegrationContextService } from '../settings/integration-context.service';
import type { IncomingHttpHeaders } from 'node:http';
import { TicketHistoryService } from './ticket-history.service';
import {
  ConversationMessageDirection as TicketMessageDirection,
  ConversationMessageStatus as TicketMessageStatus,
  ConversationMessageType as TicketMessageType,
  ConversationParticipantKind as TicketParticipantKind,
  ConversationStatus as TicketStatus,
} from '@prisma/client';

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

    const connection = await this.resolveNotificationContext(input.companyId, targetGroups.map((group) => group.jid));
    if (!connection) {
      this.logger.warn(JSON.stringify({
        flow: 'portal_to_evolution',
        stage: 'ticket_group_notification_skipped_no_connection',
        ticketId: input.ticketId,
        ticketNumber: input.ticketNumber,
        team: input.team,
        groupCount: targetGroups.length,
      }));
      await this.registerAutomationFailureNote(input.ticketId, [
        '[Automacao] Notificacao de abertura nao enviada ao WhatsApp.',
        `Ticket: ${input.ticketNumber}`,
        `Motivo: nenhuma conexao ativa da Evolution foi encontrada para o contexto atual.`,
      ]);
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

    const dispatch = await this.dispatchToGroups(targetGroups, connection.evolution, {
      connectionKey: connection.connectionKey,
      connectionSource: connection.source,
      companyId: connection.companyId,
    }, message, {
      flow: 'portal_to_evolution',
      sentStage: 'ticket_group_notification_sent',
      failedStage: 'ticket_group_notification_failed',
      ticketId: input.ticketId,
      ticketNumber: input.ticketNumber,
      team: input.team,
    });

    if (dispatch.sent === 0) {
      await this.registerAutomationFailureNote(input.ticketId, [
        '[Automacao] Notificacao de abertura nao entregue a nenhum grupo do WhatsApp.',
        `Ticket: ${input.ticketNumber}`,
        `Conexao: ${connection.connectionKey}`,
        `Tentativas: ${dispatch.attempted}`,
        `Falhas: ${dispatch.failed}`,
        ...dispatch.errors.slice(0, 5).map((item) => `- ${item}`),
      ]);
    }
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

    const connection = await this.resolveNotificationContext(input.companyId, targetGroups.map((group) => group.jid));
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
      await this.registerAutomationFailureNote(input.ticketId, [
        '[Automacao] Notificacao de status nao enviada ao WhatsApp.',
        `Ticket: ${input.ticketNumber}`,
        `Motivo: nenhuma conexao ativa da Evolution foi encontrada para o contexto atual.`,
      ]);
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

    const dispatch = await this.dispatchToGroups(targetGroups, connection.evolution, {
      connectionKey: connection.connectionKey,
      connectionSource: connection.source,
      companyId: connection.companyId,
    }, message, {
      flow: 'portal_to_evolution',
      sentStage: 'ticket_status_notification_sent',
      failedStage: 'ticket_status_notification_failed',
      ticketId: input.ticketId,
      ticketNumber: input.ticketNumber,
      notificationType: input.notificationType,
      status: input.status,
    });

    if (dispatch.sent === 0) {
      await this.registerAutomationFailureNote(input.ticketId, [
        '[Automacao] Notificacao de status nao entregue a nenhum grupo do WhatsApp.',
        `Ticket: ${input.ticketNumber}`,
        `Conexao: ${connection.connectionKey}`,
        `Tentativas: ${dispatch.attempted}`,
        `Falhas: ${dispatch.failed}`,
        ...dispatch.errors.slice(0, 5).map((item) => `- ${item}`),
      ]);
    }
  }

  private async dispatchToGroups(
    groups: Array<{ id: string; label: string; jid: string; active: boolean }>,
    evolution: unknown,
    connection: { connectionKey: string; connectionSource: string; companyId: string | null },
    message: string,
    baseLog: Record<string, unknown>,
  ) {
    const errors: string[] = [];
    let sent = 0;
    let failed = 0;

    for (const group of groups) {
      try {
        await this.evolutionClient.sendTextMessage(evolution as never, group.jid, message);
        sent += 1;
        this.logger.log(JSON.stringify({
          ...baseLog,
          stage: baseLog.sentStage,
          connectionKey: connection.connectionKey,
          connectionSource: connection.connectionSource,
          companyId: connection.companyId,
          groupJid: group.jid,
          groupLabel: group.label,
        }));
      } catch (error: any) {
        failed += 1;
        errors.push(`${group.label} (${group.jid}): ${error?.message ?? 'unknown_error'}`);
        this.logger.warn(JSON.stringify({
          ...baseLog,
          stage: baseLog.failedStage,
          connectionKey: connection.connectionKey,
          connectionSource: connection.connectionSource,
          companyId: connection.companyId,
          groupJid: group.jid,
          groupLabel: group.label,
          error: error?.message ?? 'unknown_error',
        }));
      }
    }

    return {
      attempted: groups.length,
      sent,
      failed,
      errors,
    };
  }

  private async resolveNotificationContext(
    companyId: string | null,
    targetGroupJids: string[],
  ) {
    const normalizedCompanyId = String(companyId ?? '').trim();
    const normalizedGroupJids = Array.from(
      new Set(targetGroupJids.map((jid) => String(jid ?? '').trim().toLowerCase()).filter(Boolean)),
    );

    const companyContexts = normalizedCompanyId
      ? await this.integrationContext.listActiveContexts({ companyIds: [normalizedCompanyId] })
      : [];

    const scoredCompanyContext = this.pickBestContext(companyContexts, normalizedCompanyId, normalizedGroupJids);
    if (scoredCompanyContext) return scoredCompanyContext;

    const defaultContext = await this.integrationContext.getDefaultContext();
    if (defaultContext) return defaultContext;

    const allContexts = await this.integrationContext.listActiveContexts();
    return this.pickBestContext(allContexts, normalizedCompanyId, normalizedGroupJids);
  }

  private pickBestContext(
    contexts: Array<{
      connectionKey: string;
      source: string;
      companyId: string | null;
      evolution: { allowedGroupJids?: string[]; allowedGroups?: Array<{ jid: string; name?: string }> };
    }>,
    companyId: string,
    targetGroupJids: string[],
  ) {
    if (!contexts.length) return null;

    const scored = contexts.map((context) => {
      const allowedGroups = [
        ...(context.evolution.allowedGroupJids ?? []),
        ...(context.evolution.allowedGroups ?? []).map((item) => item.jid),
      ].map((jid) => String(jid ?? '').trim().toLowerCase()).filter(Boolean);
      const hasGroupMatch =
        targetGroupJids.length > 0 &&
        allowedGroups.length > 0 &&
        targetGroupJids.some((jid) => allowedGroups.includes(jid));

      const score =
        (companyId && context.companyId === companyId ? 100 : 0) +
        (hasGroupMatch ? 20 : 0) +
        (context.source === 'database' ? 10 : 0);

      return { context, score };
    });

    scored.sort((left, right) => right.score - left.score);
    return scored[0]?.context ?? null;
  }

  private async registerAutomationFailureNote(ticketId: string, lines: string[]) {
    const body = lines.map((line) => line.trim()).filter(Boolean).join('\n');
    if (!body) return;

    await this.prisma.conversationMessage.create({
      data: {
        conversationId: ticketId,
        direction: TicketMessageDirection.INTERNAL,
        type: TicketMessageType.SYSTEM_EVENT,
        authorKind: TicketParticipantKind.EXTERNAL,
        body,
        status: TicketMessageStatus.SENT,
        sentAt: new Date(),
      },
    });
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
