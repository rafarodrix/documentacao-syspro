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
import { ChatwootClient } from './chatwoot.client';
import { EvolutionClient } from '../evolution/evolution.client';
import { ChatwootPayloadParser } from './chatwoot-payload.parser';
import { ChatwootSettingsService } from './chatwoot-settings.service';
import { ChatwootBehaviorService } from './chatwoot-behavior.service';
import { ChatwootCsatService } from './chatwoot-csat.service';
import { onlyDigits } from '@dosc-syspro/shared';

@Controller('webhooks/chatwoot')
export class ChatwootWebhookController {
  private readonly logger = new Logger(ChatwootWebhookController.name);

  constructor(
    private readonly processOutgoingMessage: ProcessOutgoingMessageUseCase,
    private readonly prisma: PrismaService,
    private readonly integrationContext: IntegrationContextService,
    private readonly chatwootClient: ChatwootClient,
    private readonly evolutionClient: EvolutionClient,
    private readonly settingsService: ChatwootSettingsService,
    private readonly behaviorService: ChatwootBehaviorService,
    private readonly csatService: ChatwootCsatService,
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
    const messageContext = ChatwootPayloadParser.resolveMessageContext(payload);

    if (payload?.event === 'message_created' && this.shouldRunOutboundHandoff(messageContext)) {
      this.logger.log(JSON.stringify({
        flow: 'chatwoot_to_evolution',
        stage: 'webhook_received',
        event: payload?.event,
        messageId: messageContext.messageId ?? null,
        messageType: messageContext.messageType,
        conversationId: ChatwootPayloadParser.extractConversationId(payload) ?? null,
        resolvedConnectionKey: resolvedContext?.connectionKey ?? null,
      }));
    }

    await this.verifySignature(resolvedContext, signatureHeader, timestampHeader, req, payload, messageContext.messageId);

    const settings = await this.settingsService.readBehaviorSettings();

    switch (payload?.event) {
      case 'message_created':
        return this.handleMessageCreated(payload, messageContext, resolvedContext, settings);

      case 'contact_updated':
        await this.handleContactUpdated(payload, resolvedContext?.connectionKey);
        break;

      case 'contact_created':
        await this.handleContactCreated(payload);
        break;

      case 'conversation_status_changed':
        await this.handleConversationStatusChanged(payload, resolvedContext, settings);
        break;

      case 'message_updated': {
        const deletedConversationMessage = ChatwootPayloadParser.findDeletedConversationMessage(payload);
        const conversationMessage =
          deletedConversationMessage ??
          ChatwootPayloadParser.findConversationMessage(payload, messageContext.messageId);
        if (ChatwootPayloadParser.shouldPropagateMessageDeletion(payload, conversationMessage)) {
          await this.handleMessageDeleted(payload, resolvedContext);
        } else {
          this.logger.debug('Evento message_updated recebido sem indicio de exclusao remota.');
        }
        break;
      }

      case 'message_deleted':
        await this.handleMessageDeleted(payload, resolvedContext);
        break;

      case 'conversation_updated':
        this.logger.debug('Evento conversation_updated recebido; nenhuma acao remota no WhatsApp configurada.');
        break;

      default:
        this.logger.debug(`Evento Chatwoot nao processado/ignorado: ${payload?.event}`);
    }

    return { ok: true };
  }

  // ──────────────────────────────────────────────────────
  // Event handlers
  // ──────────────────────────────────────────────────────

  private async handleMessageCreated(
    payload: any,
    messageContext: ReturnType<typeof ChatwootPayloadParser.resolveMessageContext>,
    resolvedContext: ResolvedIntegrationContext | null,
    settings: Awaited<ReturnType<ChatwootSettingsService['readBehaviorSettings']>>,
  ) {
    const shouldRunOutboundHandoff = this.shouldRunOutboundHandoff(messageContext);

    try {
      if (shouldRunOutboundHandoff) {
        this.logger.log(JSON.stringify({
          flow: 'chatwoot_to_evolution',
          stage: 'handoff_start',
          event: payload?.event,
          messageId: messageContext.messageId ?? null,
          messageType: messageContext.messageType,
          hasContent: Boolean(String(payload?.content ?? '').trim()),
          hasAttachments: Boolean(Array.isArray(payload?.attachments) && payload.attachments.length > 0),
        }));
      }

      const csatHandled = resolvedContext
        ? await this.csatService.handleCsatReplyIfApplicable(payload, settings, resolvedContext)
        : false;

      if (csatHandled) {
        this.logger.log(JSON.stringify({
          flow: 'chatwoot_to_portal',
          stage: 'csat_reply_consumed',
          event: payload?.event,
          messageId: messageContext.messageId ?? null,
        }));
        return { ok: true };
      }

      if (!ChatwootPayloadParser.isSystemManagedOutgoingMessage(payload) && resolvedContext) {
        await this.behaviorService.applyMessageBehaviorRules(payload, settings, resolvedContext);
      }

      if (shouldRunOutboundHandoff) {
        await this.processOutgoingMessage.execute(payload, {
          connection: resolvedContext ?? undefined,
          prependAgentNameOnOutbound: settings.prependAgentNameOnOutbound,
        });

        this.logger.log(JSON.stringify({
          flow: 'chatwoot_to_evolution',
          stage: 'handoff_complete',
          event: payload?.event,
          messageId: messageContext.messageId ?? null,
          messageType: messageContext.messageType,
        }));
      }
    } catch (error: any) {
      const knownProviderCode = typeof error?.code === 'string' ? error.code : null;
      const isKnownOutboundError = knownProviderCode === 'WHATSAPP_NUMBER_NOT_REGISTERED';
      const payloadLog = JSON.stringify({
        flow: 'chatwoot_to_evolution',
        stage: 'processing_failed',
        event: payload?.event,
        messageId: messageContext.messageId ?? null,
        error: error?.message ?? 'unknown_error',
        errorName: error?.name ?? 'Error',
        providerCode: knownProviderCode,
        stack: ChatwootPayloadParser.serializeErrorStack(error),
      });

      if (isKnownOutboundError) {
        this.logger.warn(payloadLog);
        return { ok: true, acknowledged: true, warning: error?.message ?? 'unknown_error' };
      }

      this.logger.error(payloadLog);
      return { ok: false, acknowledged: true, error: error?.message ?? 'unknown_error' };
    }

    return { ok: true };
  }

  private async handleContactCreated(payload: any): Promise<void> {
    if (!payload?.phone_number || !payload?.name) return;
    const phone = onlyDigits(payload.phone_number);
    const exists = await this.prisma.companyContact.findFirst({ where: { whatsapp: phone } });
    if (!exists) {
      await this.prisma.companyContact.create({ data: { name: payload.name, whatsapp: phone } });
      this.logger.log(`Contato ${phone} sincronizado (criado manualmente no Chatwoot)`);
    }
  }

  private async handleContactUpdated(payload: any, connectionKey?: string | null): Promise<void> {
    const contactId = ChatwootPayloadParser.toOptionalString(payload?.id ?? payload?.contact?.id);
    const phone = ChatwootPayloadParser.extractContactPhone(payload);
    const sourceIds = ChatwootPayloadParser.extractContactSourceIds(payload);
    const contactName = ChatwootPayloadParser.toOptionalString(
      payload?.custom_attributes?.syspro_contact_name ??
      payload?.contact?.custom_attributes?.syspro_contact_name ??
      payload?.name ??
      payload?.contact?.name,
    );

    if (!contactName) return;

    const link = await this.findConversationLinkForContactUpdate({ chatwootContactId: contactId, whatsappNumber: phone, sourceIds, connectionKey });
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

    const existingContact = await this.prisma.companyContact.findFirst({ where: { whatsapp: link.whatsappNumber } });
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

    if (existingContact.name === contactName) return;

    await this.prisma.companyContact.update({ where: { id: existingContact.id }, data: { name: contactName } });
    this.logger.log(JSON.stringify({
      flow: 'chatwoot_to_portal',
      stage: 'contact_updated',
      whatsappNumber: link.whatsappNumber,
      chatwootContactId: contactId ?? null,
      contactName,
      connectionKey: link.connectionKey,
    }));
  }

  private async handleConversationStatusChanged(
    payload: any,
    resolvedContext: ResolvedIntegrationContext | null,
    settings: Awaited<ReturnType<ChatwootSettingsService['readBehaviorSettings']>>,
  ): Promise<void> {
    const conversationId = ChatwootPayloadParser.toOptionalString(
      payload?.conversation?.id ?? payload?.conversation_id ?? payload?.id,
    );
    const status = ChatwootPayloadParser.normalizeConversationStatus(
      payload?.status ?? payload?.conversation?.status ?? payload?.meta?.status,
    );

    this.logger.log(JSON.stringify({
      flow: 'chatwoot_to_evolution',
      stage: 'conversation_status_received',
      conversationId: conversationId ?? null,
      status: status ?? null,
      connectionKey: resolvedContext?.connectionKey ?? null,
    }));

    if (!conversationId) return;

    if (status === 'open' && resolvedContext) {
      const customAttributes = await this.behaviorService.resolveConversationCustomAttributes(payload, resolvedContext, conversationId);
      if (ChatwootPayloadParser.readBoolean(customAttributes[ChatwootCsatService.CSAT_FORCE_RESOLVED_ON_NEXT_OPEN_FLAG])) {
        await this.csatService.forceResolveConversationAfterCsatReply(conversationId, customAttributes, resolvedContext, settings);
        return;
      }
      await this.csatService.clearCsatSkipMarkersOnConversationOpen(payload, resolvedContext, settings, conversationId);
      return;
    }

    if (status !== 'resolved' && status !== 'archived') return;

    let skippedByCancellationLabel = false;
    if (resolvedContext) {
      skippedByCancellationLabel = await this.csatService.applyCancellationLabelClosurePolicy(
        payload, resolvedContext, settings, conversationId, status,
      );
    }

    if (status === 'archived' && settings.csatTriggerStatus === 'resolved_only') {
      this.logger.debug(JSON.stringify({
        flow: 'chatwoot_to_portal', stage: 'csat_skipped_for_archived_status',
        conversationId, status, connectionKey: resolvedContext?.connectionKey ?? null,
      }));
      return;
    }

    if (!skippedByCancellationLabel && settings.csatEnabled && resolvedContext) {
      await this.csatService.triggerCsatSurveyForResolvedConversation(payload, resolvedContext, settings, conversationId, status);
    }

    const shouldKeepLinkForCsat = !skippedByCancellationLabel && settings.csatEnabled && Boolean(resolvedContext);
    if (!settings.releaseConversationLinkOnResolved || shouldKeepLinkForCsat) return;

    const deleted = await this.prisma.conversationLink.deleteMany({
      where: {
        chatwootConversationId: conversationId,
        ...(resolvedContext?.connectionKey ? { connectionKey: resolvedContext.connectionKey } : {}),
      },
    });
    this.logger.warn(JSON.stringify({
      flow: 'chatwoot_to_evolution', stage: 'conversation_link_released',
      conversationId, status, connectionKey: resolvedContext?.connectionKey ?? null,
      deletedLinks: deleted.count,
    }));
  }

  private async handleMessageDeleted(
    payload: any,
    resolvedContext: ResolvedIntegrationContext | null,
  ): Promise<void> {
    const chatwootMessageId = ChatwootPayloadParser.extractDeletionTargetMessageId(payload);
    if (!chatwootMessageId) {
      this.logger.warn(JSON.stringify({
        flow: 'chatwoot_to_evolution',
        stage: 'delete_message_skipped_missing_message_id',
        event: payload?.event ?? null,
        conversationId: ChatwootPayloadParser.extractConversationId(payload) ?? null,
      }));
      return;
    }

    let messageLink = resolvedContext?.connectionKey
      ? await this.prisma.messageLink.findUnique({
          where: { connectionKey_chatwootMessageId: { connectionKey: resolvedContext.connectionKey, chatwootMessageId } },
        })
      : null;

    if (!messageLink) {
      messageLink = await this.prisma.messageLink.findFirst({ where: { chatwootMessageId } });
    }

    if (!messageLink?.evolutionMessageId) {
      this.logger.warn(JSON.stringify({
        flow: 'chatwoot_to_evolution', stage: 'delete_message_skipped_link_not_found',
        chatwootMessageId, resolvedConnectionKey: resolvedContext?.connectionKey ?? null,
        conversationId: ChatwootPayloadParser.extractConversationId(payload) ?? null,
      }));
      return;
    }

    const integrationContext =
      resolvedContext?.connectionKey === messageLink.connectionKey
        ? resolvedContext
        : await this.integrationContext.resolveByConnectionKey(messageLink.connectionKey);

    if (!integrationContext) {
      this.logger.warn(JSON.stringify({
        flow: 'chatwoot_to_evolution', stage: 'delete_message_skipped_connection_not_resolved',
        chatwootMessageId, connectionKey: messageLink.connectionKey,
      }));
      return;
    }

    const remoteJid = await this.resolveDeleteRemoteJid(messageLink, integrationContext, chatwootMessageId);
    if (!remoteJid) {
      this.logger.warn(JSON.stringify({
        flow: 'chatwoot_to_evolution', stage: 'delete_message_skipped_remote_jid_not_found',
        chatwootMessageId, evolutionMessageId: messageLink.evolutionMessageId,
        connectionKey: messageLink.connectionKey,
      }));
      return;
    }

    await this.evolutionClient.deleteMessageForEveryone(integrationContext.evolution, {
      messageId: messageLink.evolutionMessageId,
      remoteJid,
      fromMe: true,
    });

    await this.prisma.messageLink.deleteMany({
      where: { connectionKey: messageLink.connectionKey, chatwootMessageId },
    });

    this.logger.log(JSON.stringify({
      flow: 'chatwoot_to_evolution', stage: 'delete_message_propagated',
      chatwootMessageId, evolutionMessageId: messageLink.evolutionMessageId,
      connectionKey: messageLink.connectionKey, remoteJid,
    }));
  }

  private async resolveDeleteRemoteJid(
    messageLink: {
      connectionKey: string;
      chatwootConversationId: string;
      evolutionMessageId: string;
    },
    integrationContext: ResolvedIntegrationContext,
    chatwootMessageId: string,
  ): Promise<string | null> {
    const conversationLink = await this.prisma.conversationLink.findFirst({
      where: { connectionKey: messageLink.connectionKey, chatwootConversationId: messageLink.chatwootConversationId },
    });
    if (conversationLink?.whatsappNumber) {
      return conversationLink.whatsappNumber;
    }

    const fallbackRemoteJid = await this.resolveRemoteJidFromConversationDetails(
      integrationContext,
      messageLink.chatwootConversationId,
    );
    if (fallbackRemoteJid) {
      this.logger.warn(JSON.stringify({
        flow: 'chatwoot_to_evolution',
        stage: 'delete_message_remote_jid_resolved_from_conversation',
        chatwootMessageId,
        evolutionMessageId: messageLink.evolutionMessageId,
        connectionKey: messageLink.connectionKey,
        remoteJid: fallbackRemoteJid,
      }));
      return fallbackRemoteJid;
    }

    return null;
  }

  private async resolveRemoteJidFromConversationDetails(
    integrationContext: ResolvedIntegrationContext,
    chatwootConversationId: string,
  ): Promise<string | null> {
    try {
      const conversation = await this.chatwootClient.getConversationDetails(
        integrationContext.chatwoot,
        chatwootConversationId,
      );

      const candidates = [
        conversation?.meta?.sender?.phone_number,
        conversation?.meta?.sender?.identifier,
        conversation?.meta?.channel,
        conversation?.contact?.phone_number,
        conversation?.contact_inbox?.source_id,
      ];

      for (const candidate of candidates) {
        const normalized = this.normalizeWhatsappReference(candidate);
        if (normalized) return normalized;
      }
    } catch (error: any) {
      this.logger.warn(JSON.stringify({
        flow: 'chatwoot_to_evolution',
        stage: 'delete_message_conversation_lookup_failed',
        chatwootConversationId,
        connectionKey: integrationContext.connectionKey,
        error: error?.message ?? 'unknown_error',
      }));
    }

    return null;
  }

  private normalizeWhatsappReference(value: unknown): string | null {
    const raw = String(value ?? '').trim();
    if (!raw) return null;

    if (raw.includes('@')) {
      const [localPart, domain = ''] = raw.split('@');
      const normalizedDigits = onlyDigits(localPart);
      const normalizedDomain = domain.trim().toLowerCase();
      if (
        normalizedDigits &&
        ['s.whatsapp.com', 's.whatsapp.net', 'g.us', 'newsletter'].includes(normalizedDomain)
      ) {
        return `${normalizedDigits}@${normalizedDomain}`;
      }
    }

    const digits = onlyDigits(raw);
    return digits.length >= 10 ? digits : null;
  }

  // ──────────────────────────────────────────────────────
  // Signature validation
  // ──────────────────────────────────────────────────────

  private async verifySignature(
    resolvedContext: ResolvedIntegrationContext | null,
    signatureHeader: string,
    timestampHeader: string,
    req: any,
    payload: any,
    messageId?: string,
  ): Promise<void> {
    const expectedSecret = resolvedContext?.chatwoot.webhookSecret;
    if (!expectedSecret) return;

    if (!signatureHeader || !timestampHeader) {
      this.logger.warn(JSON.stringify({ flow: 'chatwoot_to_evolution', stage: 'signature_missing', event: payload?.event ?? null, messageId: messageId ?? null }));
      throw new UnauthorizedException('Missing Chatwoot webhook signature headers');
    }

    const rawBodyBuffer = req?.rawBody as Buffer | undefined;
    if (!rawBodyBuffer) {
      this.logger.warn(JSON.stringify({ flow: 'chatwoot_to_evolution', stage: 'signature_raw_body_missing', event: payload?.event ?? null }));
      throw new UnauthorizedException('Missing raw body for Chatwoot signature validation');
    }

    const maxSkewSeconds = resolvedContext?.chatwoot.webhookMaxSkewSeconds ?? 300;
    if (!this.isTimestampFresh(timestampHeader, maxSkewSeconds)) {
      this.logger.warn(JSON.stringify({ flow: 'chatwoot_to_evolution', stage: 'timestamp_invalid', timestamp: timestampHeader, maxSkewSeconds }));
      throw new UnauthorizedException('Stale Chatwoot webhook timestamp');
    }

    const expectedSignature = this.computeSignature(expectedSecret, timestampHeader, rawBodyBuffer.toString('utf8'));
    if (!this.safeCompare(expectedSignature, signatureHeader)) {
      this.logger.warn(JSON.stringify({
        flow: 'chatwoot_to_evolution', stage: 'signature_mismatch',
        signaturePrefix: String(signatureHeader).slice(0, 12),
        expectedPrefix: String(expectedSignature).slice(0, 12),
      }));
      throw new UnauthorizedException('Invalid Chatwoot webhook signature');
    }

    const signatureValidatedPayload = JSON.stringify({
      flow: 'chatwoot_to_evolution',
      stage: 'signature_validated',
      event: payload?.event ?? null,
    });
    if (this.shouldLogSignatureAtInfoLevel(payload?.event)) {
      this.logger.log(signatureValidatedPayload);
    } else {
      this.logger.debug(signatureValidatedPayload);
    }
  }

  private shouldRunOutboundHandoff(
    messageContext: ReturnType<typeof ChatwootPayloadParser.resolveMessageContext>,
  ): boolean {
    if (messageContext.isPrivate) return false;
    return messageContext.messageType === 'outgoing' || messageContext.messageType === 'template';
  }

  private shouldLogSignatureAtInfoLevel(event: unknown): boolean {
    const normalizedEvent = String(event ?? '').trim().toLowerCase();
    return [
      'message_created',
      'message_updated',
      'message_deleted',
      'conversation_status_changed',
    ].includes(normalizedEvent);
  }

  private computeSignature(secret: string, timestamp: string, rawBody: string): string {
    const signedPayload = `${timestamp}.${rawBody}`;
    const digest = createHmac('sha256', secret).update(signedPayload).digest('hex');
    return `sha256=${digest}`;
  }

  private safeCompare(a: string, b: string): boolean {
    const aBuffer = Buffer.from(a);
    const bBuffer = Buffer.from(b);
    if (aBuffer.length !== bBuffer.length) return false;
    return timingSafeEqual(aBuffer, bBuffer);
  }

  private isTimestampFresh(timestamp: string, maxSkewSeconds: number): boolean {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const value = Number(timestamp);
    if (!Number.isFinite(value)) { this.logger.warn(`Chatwoot timestamp invalido: ${timestamp}`); return false; }
    return Math.abs(nowSeconds - value) <= maxSkewSeconds;
  }

  // ──────────────────────────────────────────────────────
  // DB helpers
  // ──────────────────────────────────────────────────────

  private async findConversationLinkForContactUpdate(input: {
    chatwootContactId?: string;
    whatsappNumber?: string;
    sourceIds: string[];
    connectionKey?: string | null;
  }) {
    const or: any[] = [];
    if (input.chatwootContactId) or.push({ chatwootContactId: input.chatwootContactId });
    for (const sourceId of input.sourceIds) or.push({ chatwootContactId: sourceId });
    if (input.whatsappNumber) or.push({ whatsappNumber: input.whatsappNumber });
    if (!or.length) return null;

    return this.prisma.conversationLink.findFirst({
      where: { ...(input.connectionKey ? { connectionKey: input.connectionKey } : {}), OR: or },
      orderBy: { updatedAt: 'desc' },
    });
  }
}
