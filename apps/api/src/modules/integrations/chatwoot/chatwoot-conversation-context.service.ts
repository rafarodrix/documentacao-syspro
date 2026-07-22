import { ForbiddenException, Injectable, Logger, NotFoundException, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import type { IncomingHttpHeaders } from 'node:http';
import type { Prisma } from '@prisma/client';
import { ChatwootCompanyContextLinkSource, ChatwootCompanyContextSyncStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthorizationService } from '../../authorization/authorization.service';
import { IntegrationContextService } from '../../settings/integration-context.service';
import { ChatwootClient } from './chatwoot.client';

const EVENT_TYPE = 'conversation.company-context.changed';
const MAX_ATTEMPTS = 6;
const LOCK_TIMEOUT_MS = 5 * 60 * 1000;
const WORKER_INTERVAL_MS = Math.max(5_000, Number(process.env.CHATWOOT_CONTEXT_SYNC_INTERVAL_MS ?? 30_000));

type BindCompanyContextInput = {
  chatwootAccountId: string;
  chatwootConversationId: string;
  chatwootContactId?: string | null;
  portalContactId: string;
  companyId: string;
  linkSource?: ChatwootCompanyContextLinkSource;
};

type NormalizedBindCompanyContextInput = Omit<BindCompanyContextInput, 'chatwootContactId' | 'linkSource'> & {
  chatwootContactId: string | null;
  linkSource: ChatwootCompanyContextLinkSource;
};

type ContextPayload = {
  chatwootAccountId: string;
  chatwootConversationId: string;
  chatwootContactId: string | null;
  portalContactId: string;
  companyId: string;
  companyName: string;
  companyCnpj: string | null;
  primaryCompanyId: string | null;
  primaryCompanyName: string | null;
  companiesCount: number;
  linkedAt: string;
};

function trimmed(value: unknown) {
  const normalized = String(value ?? '').trim();
  return normalized || null;
}

function retryDelayMs(attempts: number) {
  return Math.min(60 * 60 * 1000, 30_000 * 2 ** Math.max(0, attempts - 1));
}

@Injectable()
export class ChatwootConversationContextService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ChatwootConversationContextService.name);
  private timer?: NodeJS.Timeout;
  private flushing = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly authorizationService: AuthorizationService,
    private readonly integrationContext: IntegrationContextService,
    private readonly chatwootClient: ChatwootClient,
  ) {}

  onModuleInit() {
    void this.flushPending();
    this.timer = setInterval(() => void this.flushPending(), WORKER_INTERVAL_MS);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async bind(input: BindCompanyContextInput, rawHeaders?: IncomingHttpHeaders) {
    const requester = await this.authorizationService.getRequester(rawHeaders);
    const canEditContacts = await this.authorizationService.userHasPermission(requester, 'contacts:edit', {
      acceptCompanyScope: true,
    });
    if (!canEditContacts) throw new ForbiddenException('Sem permissao para vincular empresa ao atendimento.');

    const normalized = this.normalizeBindInput(input);
    const company = await this.prisma.company.findFirst({
      where: { id: normalized.companyId, deletedAt: null },
      select: { id: true, razaoSocial: true, nomeFantasia: true, cnpj: true },
    });
    if (!company) throw new NotFoundException('Empresa nao encontrada.');

    if (!this.authorizationService.isSystemRole(requester.role)) {
      const allowedCompanyIds = await this.authorizationService.getManagedCompanyIds(requester.userId);
      if (!allowedCompanyIds.includes(company.id)) {
        throw new ForbiddenException('Empresa fora do seu escopo.');
      }
    }

    const now = new Date();
    const result = await this.prisma.$transaction(async (tx) => {
      const contact = await tx.companyContact.findUnique({
        where: { id: normalized.portalContactId },
        select: { id: true },
      });
      if (!contact) throw new NotFoundException('Contato do portal nao encontrado.');

      await tx.companyContactCompanyLink.upsert({
        where: {
          contactId_companyId: {
            contactId: contact.id,
            companyId: company.id,
          },
        },
        create: { contactId: contact.id, companyId: company.id },
        update: {},
      });

      const links = await tx.companyContactCompanyLink.findMany({
        where: { contactId: contact.id },
        include: { company: { select: { id: true, razaoSocial: true, nomeFantasia: true } } },
      });
      const primary = links.find((link) => link.isPrimary) ?? (links.length === 1 ? links[0] : null);
      const payload: ContextPayload = {
        chatwootAccountId: normalized.chatwootAccountId,
        chatwootConversationId: normalized.chatwootConversationId,
        chatwootContactId: normalized.chatwootContactId,
        portalContactId: contact.id,
        companyId: company.id,
        companyName: company.nomeFantasia?.trim() || company.razaoSocial,
        companyCnpj: company.cnpj || null,
        primaryCompanyId: primary?.companyId ?? null,
        primaryCompanyName: primary ? primary.company.nomeFantasia?.trim() || primary.company.razaoSocial : null,
        companiesCount: links.length,
        linkedAt: now.toISOString(),
      };

      const context = await tx.chatwootConversationContext.upsert({
        where: {
          chatwootAccountId_chatwootConversationId: {
            chatwootAccountId: normalized.chatwootAccountId,
            chatwootConversationId: normalized.chatwootConversationId,
          },
        },
        create: {
          chatwootAccountId: normalized.chatwootAccountId,
          chatwootConversationId: normalized.chatwootConversationId,
          chatwootContactId: normalized.chatwootContactId,
          portalContactId: contact.id,
          activeCompanyId: company.id,
          linkedByUserId: requester.userId,
          linkSource: normalized.linkSource,
          linkedAt: now,
        },
        update: {
          chatwootContactId: normalized.chatwootContactId,
          portalContactId: contact.id,
          activeCompanyId: company.id,
          linkedByUserId: requester.userId,
          linkSource: normalized.linkSource,
          linkedAt: now,
        },
      });

      const outbox = await tx.chatwootConversationContextOutbox.upsert({
        where: { contextId: context.id },
        create: {
          contextId: context.id,
          eventType: EVENT_TYPE,
          payload: payload as Prisma.InputJsonValue,
          status: ChatwootCompanyContextSyncStatus.PENDING,
          nextAttemptAt: now,
        },
        update: {
          eventType: EVENT_TYPE,
          payload: payload as Prisma.InputJsonValue,
          revision: { increment: 1 },
          status: ChatwootCompanyContextSyncStatus.PENDING,
          attempts: 0,
          nextAttemptAt: now,
          lockedAt: null,
          errorCode: null,
          errorMessage: null,
        },
      });

      return { context, outbox, payload };
    });

    this.logger.log(JSON.stringify({
      flow: 'portal_to_chatwoot',
      stage: 'conversation_company_context_bound',
      conversationId: result.context.chatwootConversationId,
      accountId: result.context.chatwootAccountId,
      companyId: result.context.activeCompanyId,
      contextId: result.context.id,
      outboxId: result.outbox.id,
      syncStatus: result.outbox.status,
    }));

    return this.toPublicContext(result.context, result.outbox);
  }

  async retry(input: Pick<BindCompanyContextInput, 'chatwootAccountId' | 'chatwootConversationId'>, rawHeaders?: IncomingHttpHeaders) {
    const requester = await this.authorizationService.getRequester(rawHeaders);
    const canEditContacts = await this.authorizationService.userHasPermission(requester, 'contacts:edit', {
      acceptCompanyScope: true,
    });
    if (!canEditContacts) throw new ForbiddenException('Sem permissao para repetir a sincronizacao.');

    const context = await this.prisma.chatwootConversationContext.findUnique({
      where: { chatwootAccountId_chatwootConversationId: input },
      include: { outbox: true },
    });
    if (!context?.outbox) throw new NotFoundException('Contexto de conversa nao encontrado.');

    if (!this.authorizationService.isSystemRole(requester.role)) {
      const allowedCompanyIds = await this.authorizationService.getManagedCompanyIds(requester.userId);
      if (!allowedCompanyIds.includes(context.activeCompanyId)) throw new ForbiddenException('Empresa fora do seu escopo.');
    }

    const outbox = await this.prisma.chatwootConversationContextOutbox.update({
      where: { id: context.outbox.id },
      data: {
        status: ChatwootCompanyContextSyncStatus.PENDING,
        attempts: 0,
        nextAttemptAt: new Date(),
        lockedAt: null,
        errorCode: null,
        errorMessage: null,
      },
    });
    return this.toPublicContext(context, outbox);
  }

  async getWorkspace(input: Pick<BindCompanyContextInput, 'chatwootAccountId' | 'chatwootConversationId'>, rawHeaders?: IncomingHttpHeaders) {
    const requester = await this.authorizationService.getRequester(rawHeaders);
    const context = await this.prisma.chatwootConversationContext.findUnique({
      where: { chatwootAccountId_chatwootConversationId: input },
      include: { outbox: true, activeCompany: { select: { id: true, razaoSocial: true, nomeFantasia: true, cnpj: true } } },
    });
    if (!context?.outbox) return null;
    if (!this.authorizationService.isSystemRole(requester.role)) {
      const allowedCompanyIds = await this.authorizationService.getManagedCompanyIds(requester.userId);
      if (!allowedCompanyIds.includes(context.activeCompanyId)) throw new ForbiddenException('Empresa fora do seu escopo.');
    }
    const [openTickets, hosts, pendingTasks] = await Promise.all([
      this.prisma.ticket.count({ where: { companyId: context.activeCompanyId, status: { notIn: ['RESOLVED', 'ARCHIVED'] } } }),
      this.prisma.remoteHost.count({ where: { companyId: context.activeCompanyId } }),
      this.prisma.task.count({ where: { companyId: context.activeCompanyId, status: { notIn: ['COMPLETED', 'CANCELED'] } } }),
    ]);
    return {
      ...this.toPublicContext(context, context.outbox),
      company: {
        id: context.activeCompany.id,
        name: context.activeCompany.nomeFantasia?.trim() || context.activeCompany.razaoSocial,
        cnpj: context.activeCompany.cnpj,
      },
      summary: { openTickets, hosts, pendingTasks },
    };
  }

  async flushPending(limit = 20) {
    if (this.flushing) return;
    this.flushing = true;
    try {
      const now = new Date();
      const staleLock = new Date(now.getTime() - LOCK_TIMEOUT_MS);
      const candidates = await this.prisma.chatwootConversationContextOutbox.findMany({
        where: {
          status: ChatwootCompanyContextSyncStatus.PENDING,
          nextAttemptAt: { lte: now },
          OR: [{ lockedAt: null }, { lockedAt: { lt: staleLock } }],
        },
        orderBy: [{ nextAttemptAt: 'asc' }, { createdAt: 'asc' }],
        take: Math.max(1, Math.min(limit, 100)),
        select: { id: true, revision: true },
      });

      for (const candidate of candidates) {
        await this.processOutboxItem(candidate.id, candidate.revision);
      }
    } finally {
      this.flushing = false;
    }
  }

  private async processOutboxItem(outboxId: string, revision: number) {
    const lockedAt = new Date();
    const claim = await this.prisma.chatwootConversationContextOutbox.updateMany({
      where: {
        id: outboxId,
        revision,
        status: ChatwootCompanyContextSyncStatus.PENDING,
        OR: [{ lockedAt: null }, { lockedAt: { lt: new Date(lockedAt.getTime() - LOCK_TIMEOUT_MS) } }],
      },
      data: { lockedAt, lastAttemptAt: lockedAt, attempts: { increment: 1 } },
    });
    if (!claim.count) return;

    const outbox = await this.prisma.chatwootConversationContextOutbox.findUnique({
      where: { id: outboxId },
      include: { context: true },
    });
    if (!outbox) return;

    try {
      const payload = this.parsePayload(outbox.payload);
      const context = (await this.integrationContext.listActiveContexts({ companyIds: [payload.companyId] }))[0]
        ?? await this.integrationContext.getDefaultContext();
      if (!context) throw Object.assign(new Error('chatwoot_context_not_configured'), { code: 'CHATWOOT_CONTEXT_NOT_CONFIGURED' });
      if (context.chatwoot.accountId !== payload.chatwootAccountId) {
        throw Object.assign(new Error('chatwoot_account_context_mismatch'), { code: 'CHATWOOT_ACCOUNT_CONTEXT_MISMATCH' });
      }

      await this.chatwootClient.updateConversationCustomAttributes(context.chatwoot, payload.chatwootConversationId, {
        portal_company_id: payload.companyId,
        portal_company_name: payload.companyName,
        portal_company_cnpj: payload.companyCnpj,
        portal_company_link_status: 'linked',
        portal_company_linked_at: payload.linkedAt,
      });

      if (payload.chatwootContactId) {
        const contactAttributes: Record<string, unknown> = {
          portal_contact_id: payload.portalContactId,
          portal_companies_count: payload.companiesCount,
        };
        if (payload.primaryCompanyId && payload.primaryCompanyName) {
          contactAttributes.portal_primary_company_id = payload.primaryCompanyId;
          contactAttributes.portal_primary_company_name = payload.primaryCompanyName;
        }
        await this.chatwootClient.updateContact(context.chatwoot, payload.chatwootContactId, { custom_attributes: contactAttributes });
      }

      const labels = await this.chatwootClient.listConversationLabels(context.chatwoot, payload.chatwootConversationId);
      await this.chatwootClient.setConversationLabels(
        context.chatwoot,
        payload.chatwootConversationId,
        Array.from(new Set([...labels, 'cliente_vinculado'])),
      );

      const completed = await this.prisma.chatwootConversationContextOutbox.updateMany({
        where: { id: outbox.id, revision: outbox.revision },
        data: {
          status: ChatwootCompanyContextSyncStatus.SYNCED,
          lockedAt: null,
          lastSuccessAt: new Date(),
          errorCode: null,
          errorMessage: null,
        },
      });
      if (completed.count) {
        this.logger.log(JSON.stringify({
          flow: 'portal_to_chatwoot', stage: 'conversation_company_context_synced', outboxId: outbox.id,
          conversationId: payload.chatwootConversationId, companyId: payload.companyId,
        }));
      }
    } catch (error) {
      await this.recordFailure(outbox, error);
    }
  }

  private async recordFailure(outbox: { id: string; revision: number; attempts: number }, error: unknown) {
    const errorCode = trimmed((error as { code?: unknown })?.code) ?? 'CHATWOOT_CONTEXT_SYNC_FAILED';
    const errorMessage = (error instanceof Error ? error.message : String(error ?? 'unknown_error')).slice(0, 500);
    const exhausted = outbox.attempts >= MAX_ATTEMPTS;
    await this.prisma.chatwootConversationContextOutbox.updateMany({
      where: { id: outbox.id, revision: outbox.revision },
      data: {
        status: exhausted ? ChatwootCompanyContextSyncStatus.FAILED : ChatwootCompanyContextSyncStatus.PENDING,
        lockedAt: null,
        nextAttemptAt: exhausted ? new Date() : new Date(Date.now() + retryDelayMs(outbox.attempts)),
        errorCode,
        errorMessage,
      },
    });
    this.logger.warn(JSON.stringify({
      flow: 'portal_to_chatwoot', stage: exhausted ? 'conversation_company_context_sync_failed' : 'conversation_company_context_sync_retry_scheduled',
      outboxId: outbox.id, attempts: outbox.attempts, errorCode, error: errorMessage,
    }));
  }

  private normalizeBindInput(input: BindCompanyContextInput): NormalizedBindCompanyContextInput {
    const required = {
      chatwootAccountId: trimmed(input.chatwootAccountId),
      chatwootConversationId: trimmed(input.chatwootConversationId),
      portalContactId: trimmed(input.portalContactId),
      companyId: trimmed(input.companyId),
    };
    if (Object.values(required).some((value) => !value)) {
      throw new NotFoundException('Dados obrigatorios do contexto da conversa nao informados.');
    }
    return {
      chatwootAccountId: required.chatwootAccountId!,
      chatwootConversationId: required.chatwootConversationId!,
      chatwootContactId: trimmed(input.chatwootContactId),
      portalContactId: required.portalContactId!,
      companyId: required.companyId!,
      linkSource: input.linkSource ?? ChatwootCompanyContextLinkSource.MANUAL,
    };
  }

  private parsePayload(raw: Prisma.JsonValue): ContextPayload {
    const record = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw as Record<string, unknown> : null;
    const required = ['chatwootAccountId', 'chatwootConversationId', 'portalContactId', 'companyId', 'companyName', 'linkedAt'] as const;
    if (!record || required.some((key) => !trimmed(record[key]))) {
      throw Object.assign(new Error('invalid_outbox_payload'), { code: 'INVALID_OUTBOX_PAYLOAD' });
    }
    return {
      chatwootAccountId: trimmed(record.chatwootAccountId)!,
      chatwootConversationId: trimmed(record.chatwootConversationId)!,
      chatwootContactId: trimmed(record.chatwootContactId),
      portalContactId: trimmed(record.portalContactId)!,
      companyId: trimmed(record.companyId)!,
      companyName: trimmed(record.companyName)!,
      companyCnpj: trimmed(record.companyCnpj),
      primaryCompanyId: trimmed(record.primaryCompanyId),
      primaryCompanyName: trimmed(record.primaryCompanyName),
      companiesCount: Math.max(0, Number(record.companiesCount) || 0),
      linkedAt: trimmed(record.linkedAt)!,
    };
  }

  private toPublicContext(
    context: { id: string; chatwootAccountId: string; chatwootConversationId: string; activeCompanyId: string; linkSource: ChatwootCompanyContextLinkSource; linkedAt: Date },
    outbox: { status: ChatwootCompanyContextSyncStatus; lastSuccessAt: Date | null; errorCode: string | null; errorMessage: string | null },
  ) {
    return {
      id: context.id,
      chatwootAccountId: context.chatwootAccountId,
      chatwootConversationId: context.chatwootConversationId,
      activeCompanyId: context.activeCompanyId,
      linkSource: context.linkSource,
      linkedAt: context.linkedAt,
      synchronization: {
        status: outbox.status,
        lastSyncedAt: outbox.lastSuccessAt,
        errorCode: outbox.errorCode,
        errorMessage: outbox.errorMessage,
      },
    };
  }
}
