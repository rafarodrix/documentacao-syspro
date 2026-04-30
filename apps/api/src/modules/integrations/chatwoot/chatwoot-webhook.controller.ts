import {
  Controller,
  Post,
  Body,
  Headers,
  Req,
  Logger,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';
import { ProcessOutgoingMessageUseCase } from '../messaging/application/process-outgoing-message.usecase';
import { PrismaService } from '../../../prisma/prisma.service';
import { IntegrationContextService, type ResolvedIntegrationContext } from '../../settings/integration-context.service';
import { ChatwootClient, type ChatwootConnectionConfig } from './chatwoot.client';
import {
  DEFAULT_CHATWOOT_BEHAVIOR_SETTINGS,
  chatwootBehaviorSettingsSchema,
  type ChatwootBehaviorSettings,
} from '@dosc-syspro/contracts/chatwoot';

@Controller('webhooks/chatwoot')
export class ChatwootWebhookController {
  private readonly logger = new Logger(ChatwootWebhookController.name);
  private static readonly CHATWOOT_BEHAVIOR_SETTINGS_KEY = 'chatwoot_behavior_settings';
  private static readonly CSAT_RATING_MIN = 1;
  private static readonly CSAT_RATING_MAX = 5;
  private static readonly SYSTEM_MESSAGE_FLAG = 'syspro_system_message';

  constructor(
    private readonly processOutgoingMessage: ProcessOutgoingMessageUseCase,
    private readonly prisma: PrismaService,
    private readonly integrationContext: IntegrationContextService,
    private readonly chatwootClient: ChatwootClient,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async handle(
    @Headers('x-chatwoot-signature') signatureHeader: string,
    @Headers('x-chatwoot-timestamp') timestampHeader: string,
    @Req() req: any,
    @Body() payload: any,
  ) {
    const resolvedContext = await this.integrationContext.resolveForChatwootWebhook(payload);
    const message = payload?.message && typeof payload.message === 'object' ? payload.message : null;
    const conversationMessage = this.findConversationMessage(
      payload,
      payload?.id?.toString?.() ?? message?.id?.toString?.()
    );
    if (payload?.event === 'message_created') {
      this.logger.log(JSON.stringify({
        flow: 'chatwoot_to_evolution',
        stage: 'webhook_received',
        event: payload?.event,
        messageId: payload?.id?.toString?.() ?? message?.id?.toString?.(),
        messageType: payload?.message_type ?? message?.message_type,
        conversationId:
          payload?.conversation?.id?.toString?.() ??
          payload?.conversation_id?.toString?.() ??
          message?.conversation_id?.toString?.(),
        inboxId:
          payload?.inbox?.id?.toString?.() ??
          payload?.inbox_id?.toString?.() ??
          payload?.conversation?.inbox_id?.toString?.() ??
          message?.inbox_id?.toString?.(),
        accountId:
          payload?.account?.id?.toString?.() ??
          payload?.account_id?.toString?.() ??
          payload?.conversation?.account_id?.toString?.() ??
          message?.account_id?.toString?.(),
        resolvedConnectionKey: resolvedContext?.connectionKey ?? null,
      }));
    }

    const expectedSecret = resolvedContext?.chatwoot.webhookSecret;
    if (expectedSecret) {
      if (!signatureHeader || !timestampHeader) {
        this.logger.warn(JSON.stringify({
          flow: 'chatwoot_to_evolution',
          stage: 'signature_missing',
          event: payload?.event ?? null,
          messageId: payload?.id?.toString?.() ?? message?.id?.toString?.() ?? null,
          hasSignature: Boolean(signatureHeader),
          hasTimestamp: Boolean(timestampHeader),
        }));
        throw new UnauthorizedException('Missing Chatwoot webhook signature headers');
      }

      const rawBodyBuffer = req?.rawBody as Buffer | undefined;
      if (!rawBodyBuffer) {
        this.logger.warn(JSON.stringify({
          flow: 'chatwoot_to_evolution',
          stage: 'signature_raw_body_missing',
          event: payload?.event ?? null,
          messageId: payload?.id?.toString?.() ?? message?.id?.toString?.() ?? null,
        }));
        throw new UnauthorizedException('Missing raw body for Chatwoot signature validation');
      }

      if (!this.isTimestampFresh(timestampHeader, resolvedContext?.chatwoot.webhookMaxSkewSeconds ?? 300)) {
        this.logger.warn(JSON.stringify({
          flow: 'chatwoot_to_evolution',
          stage: 'timestamp_invalid',
          event: payload?.event ?? null,
          messageId: payload?.id?.toString?.() ?? message?.id?.toString?.() ?? null,
          timestamp: timestampHeader,
          maxSkewSeconds: resolvedContext?.chatwoot.webhookMaxSkewSeconds ?? 300,
        }));
        throw new UnauthorizedException('Stale Chatwoot webhook timestamp');
      }

      const expectedSignature = this.computeSignature(expectedSecret, timestampHeader, rawBodyBuffer.toString('utf8'));
      if (!this.safeCompare(expectedSignature, signatureHeader)) {
        this.logger.warn(JSON.stringify({
          flow: 'chatwoot_to_evolution',
          stage: 'signature_mismatch',
          event: payload?.event ?? null,
          messageId: payload?.id?.toString?.() ?? message?.id?.toString?.() ?? null,
          signaturePrefix: String(signatureHeader).slice(0, 12),
          expectedPrefix: String(expectedSignature).slice(0, 12),
        }));
        throw new UnauthorizedException('Invalid Chatwoot webhook signature');
      }

      this.logger.log(JSON.stringify({
        flow: 'chatwoot_to_evolution',
        stage: 'signature_validated',
        event: payload?.event ?? null,
        messageId: payload?.id?.toString?.() ?? message?.id?.toString?.() ?? null,
      }));
    }

    const behaviorSettings = await this.readStoredChatwootBehaviorSettings();

    switch (payload?.event) {
      case 'message_created':
        try {
          this.logger.log(JSON.stringify({
            flow: 'chatwoot_to_evolution',
            stage: 'handoff_start',
            event: payload?.event,
            messageId: payload?.id?.toString?.() ?? message?.id?.toString?.() ?? null,
            messageType: payload?.message_type ?? message?.message_type ?? null,
            conversationId:
              payload?.conversation?.id?.toString?.() ??
              payload?.conversation_id?.toString?.() ??
              message?.conversation_id?.toString?.() ??
              null,
            hasContent: Boolean(
              String(
                payload?.content ??
                message?.content ??
                payload?.content_attributes?.message ??
                message?.content_attributes?.message ??
                ''
              ).trim()
            ),
            hasAttachments: Boolean(
              (Array.isArray(payload?.attachments) && payload.attachments.length > 0) ||
              (Array.isArray(message?.attachments) && message.attachments.length > 0) ||
              (Array.isArray(conversationMessage?.attachments) && conversationMessage.attachments.length > 0)
            ),
          }));
          const csatHandled = await this.handleCsatReplyIfApplicable(payload, behaviorSettings, resolvedContext);
          if (csatHandled) {
            this.logger.log(JSON.stringify({
              flow: 'chatwoot_to_portal',
              stage: 'csat_reply_consumed',
              event: payload?.event,
              messageId: payload?.id?.toString?.() ?? message?.id?.toString?.() ?? null,
            }));
            break;
          }
          if (!this.isSystemManagedOutgoingMessage(payload)) {
            await this.applyMessageBehaviorRules(payload, behaviorSettings, resolvedContext);
          }
          await this.processOutgoingMessage.execute(payload, {
            connection: resolvedContext ?? undefined,
            prependAgentNameOnOutbound: behaviorSettings.prependAgentNameOnOutbound,
          });
          this.logger.log(JSON.stringify({
            flow: 'chatwoot_to_evolution',
            stage: 'handoff_complete',
            event: payload?.event,
            messageId: payload?.id?.toString?.() ?? message?.id?.toString?.() ?? null,
            messageType: payload?.message_type ?? message?.message_type ?? null,
          }));
        } catch (error: any) {
          const knownProviderCode =
            typeof error?.code === 'string' ? error.code : null;
          const isKnownOutboundError =
            knownProviderCode === 'WHATSAPP_NUMBER_NOT_REGISTERED';
          const payloadLog = JSON.stringify({
            flow: 'chatwoot_to_evolution',
            stage: 'processing_failed',
            event: payload?.event,
            messageId: payload?.id?.toString?.() ?? message?.id?.toString?.() ?? null,
            error: error?.message ?? 'unknown_error',
            errorName: error?.name ?? 'Error',
            providerCode: knownProviderCode,
            stack: this.serializeErrorStack(error),
          });
          if (isKnownOutboundError) {
            this.logger.warn(payloadLog);
            return {
              ok: true,
              acknowledged: true,
              warning: error?.message ?? 'unknown_error',
            };
          }

          this.logger.error(payloadLog);
          return {
            ok: false,
            acknowledged: true,
            error: error?.message ?? 'unknown_error',
          };
        }
        break;
      case 'contact_updated':
        await this.handleContactUpdated(payload, resolvedContext?.connectionKey);
        break;
      case 'contact_created':
        if (payload?.phone_number && payload?.name) {
          const phone = payload.phone_number.replace(/\D/g, '');
          const exists = await this.prisma.companyContact.findFirst({ where: { whatsapp: phone } });
          if (!exists) {
            await this.prisma.companyContact.create({
              data: { name: payload.name, whatsapp: phone }
            });
            this.logger.log(`Contato ${phone} sincronizado (criado manualmente no Chatwoot)`);
          }
        }
        break;
      case 'conversation_status_changed':
        await this.handleConversationStatusChanged(payload, resolvedContext, behaviorSettings);
        break;
      case 'conversation_updated':
        this.logger.debug('Evento conversation_updated recebido; nenhuma acao remota no WhatsApp configurada.');
        break;
      case 'message_updated':
        this.logger.debug('Evento message_updated ignorado: exclusao remota no WhatsApp via endpoint legado removida.');
        break;
      default:
        this.logger.debug(`Evento Chatwoot nao processado/ignorado: ${payload?.event}`);
    }

    return { ok: true };
  }

  private async applyMessageBehaviorRules(
    payload: any,
    settings: ChatwootBehaviorSettings,
    resolvedContext: ResolvedIntegrationContext | null,
  ) {
    if (!resolvedContext?.chatwoot.url || !resolvedContext.chatwoot.apiToken || !resolvedContext.chatwoot.accountId) {
      this.logger.debug(JSON.stringify({
        flow: 'chatwoot_to_evolution',
        stage: 'behavior_rules_skipped_missing_context',
        event: payload?.event ?? null,
      }));
      return;
    }

    const context = this.resolveMessageContext(payload);

    if (
      settings.autoAssignOnFirstAgentReply &&
      !context.isPrivate &&
      (context.messageType === 'outgoing' || context.messageType === 'template')
    ) {
      await this.autoAssignConversationToReplyingAgent(payload, resolvedContext);
    } else if (settings.autoAssignOnFirstAgentReply) {
      this.logger.debug(JSON.stringify({
        flow: 'chatwoot_to_evolution',
        stage: 'conversation_auto_assign_skipped',
        messageType: context.messageType,
        isPrivate: context.isPrivate,
        messageId: context.messageId ?? null,
      }));
    }

    if (
      settings.reopenConversationOnCustomerReply &&
      context.messageType === 'incoming'
    ) {
      await this.reopenConversationForCustomerReply(payload, resolvedContext);
    }
  }

  private async autoAssignConversationToReplyingAgent(payload: any, resolvedContext: ResolvedIntegrationContext) {
    const conversationId = this.extractConversationId(payload);
    const assigneeId = this.extractSenderAgentId(payload);
    if (!conversationId || !assigneeId) {
      this.logger.warn(JSON.stringify({
        flow: 'chatwoot_to_evolution',
        stage: 'conversation_auto_assign_missing_fields',
        conversationId: conversationId ?? null,
        assigneeId: assigneeId ?? null,
        messageId: this.resolveMessageContext(payload).messageId ?? null,
      }));
      return;
    }
    if (!/^\d+$/.test(assigneeId)) {
      this.logger.warn(JSON.stringify({
        flow: 'chatwoot_to_evolution',
        stage: 'conversation_auto_assign_invalid_assignee',
        conversationId,
        assigneeId,
      }));
      return;
    }

    const currentAssigneeId = await this.resolveCurrentConversationAssigneeId(payload, resolvedContext, conversationId);
    if (currentAssigneeId) {
      this.logger.debug(JSON.stringify({
        flow: 'chatwoot_to_evolution',
        stage: 'conversation_auto_assign_skipped_already_assigned',
        conversationId,
        currentAssigneeId,
      }));
      return;
    }

    try {
      await this.chatwootClient.assignConversation(resolvedContext.chatwoot, conversationId, { assigneeId });
      this.logger.log(JSON.stringify({
        flow: 'chatwoot_to_evolution',
        stage: 'conversation_auto_assigned',
        conversationId,
        assigneeId,
        connectionKey: resolvedContext.connectionKey,
      }));
    } catch (error: any) {
      this.logger.warn(JSON.stringify({
        flow: 'chatwoot_to_evolution',
        stage: 'conversation_auto_assign_failed',
        conversationId,
        assigneeId,
        error: error?.message ?? 'unknown_error',
      }));
    }
  }

  private async reopenConversationForCustomerReply(payload: any, resolvedContext: ResolvedIntegrationContext) {
    const conversationId = this.extractConversationId(payload);
    if (!conversationId) {
      return;
    }

    let status = this.normalizeConversationStatus(
      payload?.conversation?.status ??
      payload?.status ??
      payload?.meta?.status
    );
    if (!status) {
      try {
        const conversation = await this.chatwootClient.getConversationDetails(resolvedContext.chatwoot, conversationId);
        status = this.normalizeConversationStatus(conversation?.status ?? conversation?.payload?.status);
      } catch (error: any) {
        this.logger.warn(JSON.stringify({
          flow: 'chatwoot_to_evolution',
          stage: 'conversation_status_lookup_failed',
          conversationId,
          error: error?.message ?? 'unknown_error',
        }));
        return;
      }
    }

    if (status === 'open') {
      return;
    }

    try {
      await this.chatwootClient.toggleConversationStatus(resolvedContext.chatwoot, conversationId, 'open');
      this.logger.log(JSON.stringify({
        flow: 'chatwoot_to_evolution',
        stage: 'conversation_reopened_on_customer_reply',
        conversationId,
        previousStatus: status ?? null,
        connectionKey: resolvedContext.connectionKey,
      }));
    } catch (error: any) {
      this.logger.warn(JSON.stringify({
        flow: 'chatwoot_to_evolution',
        stage: 'conversation_reopen_failed',
        conversationId,
        previousStatus: status ?? null,
        error: error?.message ?? 'unknown_error',
      }));
    }
  }

  private async handleCsatReplyIfApplicable(
    payload: any,
    settings: ChatwootBehaviorSettings,
    resolvedContext: ResolvedIntegrationContext | null,
  ): Promise<boolean> {
    if (!settings.csatEnabled || !resolvedContext) {
      return false;
    }

    const context = this.resolveMessageContext(payload);
    if (context.isPrivate || context.messageType !== 'incoming') {
      return false;
    }

    const conversationId = this.extractConversationId(payload);
    if (!conversationId) {
      return false;
    }

    const customAttributes = await this.resolveConversationCustomAttributes(payload, resolvedContext, conversationId);
    if (!this.readBoolean(customAttributes.csat_pending)) {
      return false;
    }

    const score = this.parseCsatScore(
      payload?.content ??
      context.message?.content ??
      payload?.content_attributes?.message ??
      context.message?.content_attributes?.message,
    );
    if (score === null) {
      return false;
    }

    const contact = this.extractContactPhone(payload) ?? this.toOptionalString(customAttributes.csat_contact) ?? null;
    const agentId = this.toOptionalString(customAttributes.csat_agent_id) ?? null;
    const agentName = this.toOptionalString(customAttributes.csat_agent_name) ?? null;
    const isLowScore = score <= settings.csatLowScoreThreshold;
    const respondedAt = new Date().toISOString();

    await this.prisma.chatwootCsatRating.upsert({
      where: { chatwootConversationId: conversationId },
      update: {
        score,
        contact,
        agentId,
        agentName,
        status: isLowScore ? 'LOW_SCORE' : 'RECORDED',
        respondedAt: new Date(respondedAt),
        requestedAt: this.parseOptionalDate(customAttributes.csat_requested_at),
      },
      create: {
        chatwootConversationId: conversationId,
        connectionKey: resolvedContext.connectionKey,
        contact,
        agentId,
        agentName,
        score,
        status: isLowScore ? 'LOW_SCORE' : 'RECORDED',
        requestedAt: this.parseOptionalDate(customAttributes.csat_requested_at),
        respondedAt: new Date(respondedAt),
      },
    });

    await this.chatwootClient.updateConversationCustomAttributes(resolvedContext.chatwoot, conversationId, {
      ...customAttributes,
      csat_pending: false,
      csat_status: isLowScore ? 'low_score' : 'recorded',
      csat_score: score,
      csat_responded_at: respondedAt,
    });

    if (settings.csatThankYouMessage.trim()) {
      await this.chatwootClient.createOutgoingMessage(
        this.withSystemMessageConfig(resolvedContext.chatwoot, settings),
        conversationId,
        settings.csatThankYouMessage.trim(),
        {
          useSystemBot: settings.systemMessagesUseBotIdentity,
          contentAttributes: this.buildSystemMessageAttributes(),
        },
      );
    }

    if (isLowScore && settings.csatReopenOnLowScore) {
      await this.chatwootClient.toggleConversationStatus(resolvedContext.chatwoot, conversationId, 'open');
    } else if (settings.releaseConversationLinkOnResolved) {
      await this.prisma.conversationLink.deleteMany({
        where: {
          chatwootConversationId: conversationId,
          connectionKey: resolvedContext.connectionKey,
        },
      });
    }

    this.logger.log(JSON.stringify({
      flow: 'chatwoot_to_portal',
      stage: 'csat_recorded',
      conversationId,
      score,
      lowScore: isLowScore,
      connectionKey: resolvedContext.connectionKey,
    }));

    return true;
  }

  private async triggerCsatSurveyForResolvedConversation(
    payload: any,
    resolvedContext: ResolvedIntegrationContext,
    settings: ChatwootBehaviorSettings,
    conversationId: string,
    status: string,
  ) {
    const customAttributes = await this.resolveConversationCustomAttributes(payload, resolvedContext, conversationId);
    if (this.readBoolean(customAttributes.csat_pending) || customAttributes.csat_responded_at) {
      this.logger.debug(JSON.stringify({
        flow: 'chatwoot_to_portal',
        stage: 'csat_skipped_existing_state',
        conversationId,
        status,
        connectionKey: resolvedContext.connectionKey,
      }));
      return;
    }

    const requestedAt = new Date().toISOString();
    const timeoutAt = new Date(Date.now() + settings.csatPendingTimeoutHours * 60 * 60 * 1000).toISOString();
    const agent = this.extractAgentIdentity(payload);
    const contact = this.extractContactPhone(payload);

    await this.chatwootClient.createOutgoingMessage(
      this.withSystemMessageConfig(resolvedContext.chatwoot, settings),
      conversationId,
      settings.csatRequestMessage.trim(),
      {
        useSystemBot: settings.systemMessagesUseBotIdentity,
          contentAttributes: this.buildSystemMessageAttributes(),
      },
    );
    await this.chatwootClient.updateConversationCustomAttributes(resolvedContext.chatwoot, conversationId, {
      ...customAttributes,
      csat_pending: true,
      csat_status: 'pending',
      csat_requested_at: requestedAt,
      csat_timeout_at: timeoutAt,
      csat_agent_id: agent.id,
      csat_agent_name: agent.name,
      csat_contact: contact,
    });

    this.logger.log(JSON.stringify({
      flow: 'chatwoot_to_portal',
      stage: 'csat_requested',
      conversationId,
      status,
      connectionKey: resolvedContext.connectionKey,
      agentId: agent.id ?? null,
      agentName: agent.name ?? null,
    }));
  }

  private async resolveConversationCustomAttributes(
    payload: any,
    resolvedContext: ResolvedIntegrationContext,
    conversationId: string,
  ): Promise<Record<string, unknown>> {
    const inlineAttributes = this.readConversationCustomAttributesFromPayload(payload);
    if (Object.keys(inlineAttributes).length > 0) {
      return inlineAttributes;
    }

    try {
      const conversation = await this.chatwootClient.getConversationDetails(resolvedContext.chatwoot, conversationId);
      const fromConversation = this.readConversationCustomAttributesFromPayload(conversation);
      return fromConversation;
    } catch (error: any) {
      this.logger.warn(JSON.stringify({
        flow: 'chatwoot_to_portal',
        stage: 'csat_custom_attributes_lookup_failed',
        conversationId,
        connectionKey: resolvedContext.connectionKey,
        error: error?.message ?? 'unknown_error',
      }));
      return {};
    }
  }

  private readConversationCustomAttributesFromPayload(payload: any): Record<string, unknown> {
    const value =
      payload?.conversation?.custom_attributes ??
      payload?.custom_attributes ??
      payload?.meta?.custom_attributes ??
      payload?.payload?.custom_attributes;

    return value && typeof value === 'object' && !Array.isArray(value)
      ? { ...(value as Record<string, unknown>) }
      : {};
  }

  private parseCsatScore(value: unknown): number | null {
    const normalized = String(value ?? '').trim();
    if (!/^[1-5]$/.test(normalized)) {
      return null;
    }

    const score = Number(normalized);
    if (score < ChatwootWebhookController.CSAT_RATING_MIN || score > ChatwootWebhookController.CSAT_RATING_MAX) {
      return null;
    }

    return score;
  }

  private extractAgentIdentity(payload: any): { id?: string; name?: string } {
    const { message, conversationMessage } = this.resolveMessageContext(payload);
    const sender =
      payload?.sender ??
      message?.sender ??
      conversationMessage?.sender ??
      payload?.conversation?.meta?.assignee;

    return {
      id: this.toOptionalString(
        sender?.id ??
        payload?.conversation?.meta?.assignee?.id,
      ),
      name: this.toOptionalString(
        sender?.name ??
        sender?.available_name ??
        payload?.conversation?.meta?.assignee?.name ??
        payload?.conversation?.meta?.assignee?.available_name,
      ),
    };
  }

  private parseOptionalDate(value: unknown): Date | null {
    const normalized = this.toOptionalString(value);
    if (!normalized) return null;
    const parsed = new Date(normalized);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private async resolveCurrentConversationAssigneeId(
    payload: any,
    resolvedContext: ResolvedIntegrationContext,
    conversationId: string,
  ): Promise<string | null> {
    const fromPayload = this.extractAssigneeId(payload?.conversation ?? payload);
    if (fromPayload) {
      return fromPayload;
    }

    try {
      const conversation = await this.chatwootClient.getConversationDetails(resolvedContext.chatwoot, conversationId);
      return this.extractAssigneeId(conversation);
    } catch (error: any) {
      this.logger.warn(JSON.stringify({
        flow: 'chatwoot_to_evolution',
        stage: 'conversation_assignee_lookup_failed',
        conversationId,
        error: error?.message ?? 'unknown_error',
      }));
      return 'lookup_failed';
    }
  }

  private serializeErrorStack(error: unknown): string | null {
    const stack = error instanceof Error ? error.stack : null;
    if (!stack) return null;
    return stack.split('\n').slice(0, 8).join('\n');
  }

  private computeSignature(secret: string, timestamp: string, rawBody: string): string {
    const signedPayload = `${timestamp}.${rawBody}`;
    const digest = createHmac('sha256', secret).update(signedPayload).digest('hex');
    return `sha256=${digest}`;
  }

  private safeCompare(a: string, b: string): boolean {
    const aBuffer = Buffer.from(a);
    const bBuffer = Buffer.from(b);
    if (aBuffer.length !== bBuffer.length) {
      return false;
    }
    return timingSafeEqual(aBuffer, bBuffer);
  }

  private isTimestampFresh(timestamp: string, maxSkewSeconds: number): boolean {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const value = Number(timestamp);
    if (!Number.isFinite(value)) {
      this.logger.warn(`Chatwoot timestamp invalido: ${timestamp}`);
      return false;
    }

    return Math.abs(nowSeconds - value) <= maxSkewSeconds;
  }

  private async handleConversationStatusChanged(
    payload: any,
    resolvedContext: ResolvedIntegrationContext | null,
    settings: ChatwootBehaviorSettings = DEFAULT_CHATWOOT_BEHAVIOR_SETTINGS,
  ) {
    const conversationId = this.toOptionalString(
      payload?.conversation?.id ??
      payload?.conversation_id ??
      payload?.id
    );
    const status = this.normalizeConversationStatus(
      payload?.status ??
      payload?.conversation?.status ??
      payload?.meta?.status
    );

    this.logger.log(JSON.stringify({
      flow: 'chatwoot_to_evolution',
      stage: 'conversation_status_received',
      conversationId: conversationId ?? null,
      status: status ?? null,
      connectionKey: resolvedContext?.connectionKey ?? null,
    }));

    if (!conversationId || (status !== 'resolved' && status !== 'archived')) {
      return;
    }

    if (settings.csatEnabled && resolvedContext) {
      await this.triggerCsatSurveyForResolvedConversation(payload, resolvedContext, settings, conversationId, status);
    }

    const shouldKeepLinkForCsat = settings.csatEnabled && Boolean(resolvedContext);
    if (!settings.releaseConversationLinkOnResolved || shouldKeepLinkForCsat) {
      return;
    }

    const deleted = await this.prisma.conversationLink.deleteMany({
      where: {
        chatwootConversationId: conversationId,
        ...(resolvedContext?.connectionKey ? { connectionKey: resolvedContext.connectionKey } : {}),
      },
    });

    this.logger.warn(JSON.stringify({
      flow: 'chatwoot_to_evolution',
      stage: 'conversation_link_released',
      conversationId,
      status,
      connectionKey: resolvedContext?.connectionKey ?? null,
      deletedLinks: deleted.count,
    }));
  }

  private async handleContactUpdated(payload: any, connectionKey?: string | null) {
    const contactId = this.toOptionalString(payload?.id ?? payload?.contact?.id);
    const phone = this.extractContactPhone(payload);
    const sourceIds = this.extractContactSourceIds(payload);
    const contactName = this.toOptionalString(
      payload?.custom_attributes?.syspro_contact_name ??
      payload?.contact?.custom_attributes?.syspro_contact_name ??
      payload?.name ??
      payload?.contact?.name
    );

    if (!contactName) {
      return;
    }

    const link = await this.findConversationLinkForContactUpdate({
      chatwootContactId: contactId,
      whatsappNumber: phone,
      sourceIds,
      connectionKey,
    });

    if (!link) {
      this.logger.warn(JSON.stringify({
        flow: 'chatwoot_to_portal',
        stage: 'contact_update_link_not_found',
        chatwootContactId: contactId ?? null,
        whatsappNumber: phone ?? null,
        sourceIds,
        connectionKey: connectionKey ?? null,
      }));
      return;
    }

    const existingContact = await this.prisma.companyContact.findFirst({
      where: { whatsapp: link.whatsappNumber },
    });

    if (!existingContact) {
      this.logger.warn(JSON.stringify({
        flow: 'chatwoot_to_portal',
        stage: 'contact_update_portal_contact_not_found',
        chatwootContactId: contactId ?? null,
        whatsappNumber: link.whatsappNumber,
        connectionKey: link.connectionKey,
      }));
      return;
    }

    if (existingContact.name === contactName) {
      return;
    }

    await this.prisma.companyContact.update({
      where: { id: existingContact.id },
      data: { name: contactName },
    });

    this.logger.log(JSON.stringify({
      flow: 'chatwoot_to_portal',
      stage: 'contact_updated',
      whatsappNumber: link.whatsappNumber,
      chatwootContactId: contactId ?? null,
      storedChatwootContactId: link.chatwootContactId,
      contactName,
      connectionKey: link.connectionKey,
    }));
  }

  private async findConversationLinkForContactUpdate(input: {
    chatwootContactId?: string;
    whatsappNumber?: string;
    sourceIds: string[];
    connectionKey?: string | null;
  }) {
    const or: any[] = [];

    if (input.chatwootContactId) {
      or.push({ chatwootContactId: input.chatwootContactId });
    }

    for (const sourceId of input.sourceIds) {
      or.push({ chatwootContactId: sourceId });
    }

    if (input.whatsappNumber) {
      or.push({ whatsappNumber: input.whatsappNumber });
    }

    if (!or.length) return null;

    return this.prisma.conversationLink.findFirst({
      where: {
        ...(input.connectionKey ? { connectionKey: input.connectionKey } : {}),
        OR: or,
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  private extractContactPhone(payload: any): string | undefined {
    const value = this.toOptionalString(
      payload?.phone_number ??
      payload?.phoneNumber ??
      payload?.contact?.phone_number ??
      payload?.contact?.phoneNumber ??
      payload?.additional_attributes?.phone_number ??
      payload?.contact?.additional_attributes?.phone_number
    );
    const digits = String(value ?? '').replace(/\D/g, '');
    return digits || undefined;
  }

  private extractContactSourceIds(payload: any): string[] {
    const sourceIds = [
      payload?.source_id,
      payload?.sourceId,
      payload?.contact?.source_id,
      payload?.contact?.sourceId,
      ...(Array.isArray(payload?.contact_inboxes)
        ? payload.contact_inboxes.map((item: any) => item?.source_id ?? item?.sourceId)
        : []),
      ...(Array.isArray(payload?.contact?.contact_inboxes)
        ? payload.contact.contact_inboxes.map((item: any) => item?.source_id ?? item?.sourceId)
        : []),
    ]
      .map((value) => this.toOptionalString(value))
      .filter((value): value is string => Boolean(value));

    return Array.from(new Set(sourceIds));
  }

  private normalizeConversationStatus(value: unknown): string | null {
    const normalized = String(value ?? '').trim().toLowerCase();
    if (!normalized) return null;

    if (normalized === 'resolved' || normalized === 'archived') return normalized;
    if (normalized === 'open' || normalized === 'pending' || normalized === 'snoozed') return normalized;
    return normalized;
  }

  private isSystemManagedOutgoingMessage(payload: any): boolean {
    const { message, conversationMessage } = this.resolveMessageContext(payload);
    return this.readBoolean(
      payload?.content_attributes?.[ChatwootWebhookController.SYSTEM_MESSAGE_FLAG] ??
      message?.content_attributes?.[ChatwootWebhookController.SYSTEM_MESSAGE_FLAG] ??
      conversationMessage?.content_attributes?.[ChatwootWebhookController.SYSTEM_MESSAGE_FLAG]
    );
  }

  private buildSystemMessageAttributes(): Record<string, unknown> {
    return {
      [ChatwootWebhookController.SYSTEM_MESSAGE_FLAG]: true,
    };
  }

  private withSystemMessageConfig(
    config: ResolvedIntegrationContext['chatwoot'],
    settings: ChatwootBehaviorSettings,
  ): ChatwootConnectionConfig {
    return {
      ...config,
      systemBotApiToken: settings.systemMessageApiToken.trim() || undefined,
    };
  }

  private normalizeMessageType(value: unknown): 'incoming' | 'outgoing' | 'template' | 'unknown' {
    const normalized = String(value ?? '').trim().toLowerCase();
    if (normalized === 'incoming' || normalized === 'outgoing' || normalized === 'template') {
      return normalized;
    }

    if (normalized === '0') return 'incoming';
    if (normalized === '1') return 'outgoing';
    if (normalized === '2') return 'template';
    return 'unknown';
  }

  private extractConversationId(payload: any): string | undefined {
    const { message, conversationMessage } = this.resolveMessageContext(payload);
    return this.toOptionalString(
      payload?.conversation?.id ??
      payload?.conversation_id ??
      message?.conversation_id ??
      message?.conversation?.id ??
      conversationMessage?.conversation_id ??
      conversationMessage?.conversation?.id
    );
  }

  private extractSenderAgentId(payload: any): string | undefined {
    const { message, conversationMessage } = this.resolveMessageContext(payload);
    const sender =
      payload?.sender ??
      message?.sender ??
      conversationMessage?.sender ??
      payload?.user ??
      message?.user ??
      conversationMessage?.user;
    const senderType = String(
      sender?.type ??
      sender?.sender_type ??
      payload?.sender_type ??
      message?.sender_type ??
      conversationMessage?.sender_type ??
      ''
    ).trim().toLowerCase();

    if (senderType && !['user', 'agent'].includes(senderType)) {
      return undefined;
    }

    return this.toOptionalString(
      sender?.id ??
      payload?.sender_id ??
      message?.sender_id ??
      conversationMessage?.sender_id ??
      payload?.user_id ??
      message?.user_id ??
      conversationMessage?.user_id
    );
  }

  private extractAssigneeId(value: any): string | null {
    return this.toOptionalString(
      value?.assignee_id ??
      value?.current_assignee_id ??
      value?.assignee?.id ??
      value?.current_assignee?.id ??
      value?.meta?.assignee?.id ??
      value?.meta?.assignee_id ??
      value?.payload?.assignee_id ??
      value?.payload?.assignee?.id
    ) ?? null;
  }

  private resolveMessageContext(payload: any): {
    message: any | null;
    conversationMessage: any | null;
    messageId?: string;
    messageType: 'incoming' | 'outgoing' | 'template' | 'unknown';
    isPrivate: boolean;
  } {
    const message = payload?.message && typeof payload.message === 'object' ? payload.message : null;
    const messageId = this.toOptionalString(payload?.id ?? message?.id);
    const conversationMessage = this.findConversationMessage(payload, messageId);
    const messageType = this.normalizeMessageType(
      payload?.message_type ??
      message?.message_type ??
      conversationMessage?.message_type
    );
    const isPrivate = this.readBoolean(
      payload?.private ??
      message?.private ??
      conversationMessage?.private
    );

    return {
      message,
      conversationMessage,
      messageId,
      messageType,
      isPrivate,
    };
  }

  private readBoolean(value: unknown): boolean {
    if (typeof value === 'boolean') return value;
    const normalized = String(value ?? '').trim().toLowerCase();
    return normalized === 'true' || normalized === '1';
  }

  private async readStoredChatwootBehaviorSettings(): Promise<ChatwootBehaviorSettings> {
    const setting = await this.prisma.systemSetting.findUnique({
      where: { key: ChatwootWebhookController.CHATWOOT_BEHAVIOR_SETTINGS_KEY },
      select: { value: true },
    });

    if (!setting?.value) {
      return DEFAULT_CHATWOOT_BEHAVIOR_SETTINGS;
    }

    try {
      const parsed = JSON.parse(setting.value);
      const validation = chatwootBehaviorSettingsSchema.safeParse(parsed);
      return validation.success ? validation.data : DEFAULT_CHATWOOT_BEHAVIOR_SETTINGS;
    } catch {
      return DEFAULT_CHATWOOT_BEHAVIOR_SETTINGS;
    }
  }

  private toOptionalString(value: unknown): string | undefined {
    const normalized = String(value ?? '').trim();
    return normalized || undefined;
  }

  private findConversationMessage(payload: any, messageId?: string): any | null {
    const messages = Array.isArray(payload?.conversation?.messages)
      ? payload.conversation.messages
      : [];
    if (messages.length === 0) return null;

    if (messageId) {
      const matchingMessage = messages.find((item: any) => String(item?.id ?? '') === messageId);
      if (matchingMessage) return matchingMessage;
    }

    return messages[0] ?? null;
  }
}
