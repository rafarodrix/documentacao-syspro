import { Injectable, Logger } from '@nestjs/common';
import { EvolutionClient, EvolutionOutboundError } from '../../evolution/evolution.client';
import { ChatwootClient } from '../../chatwoot/chatwoot.client';
import { PrismaService } from '../../../../prisma/prisma.service';
import { IntegrationWebhookDedupService } from './integration-webhook-dedup.service';
import { IntegrationContextService, type ResolvedIntegrationContext } from '../../../settings/integration-context.service';

@Injectable()
export class ProcessOutgoingMessageUseCase {
  private readonly logger = new Logger(ProcessOutgoingMessageUseCase.name);

  constructor(
    private readonly evolutionClient: EvolutionClient,
    private readonly chatwootClient: ChatwootClient,
    private readonly prisma: PrismaService,
    private readonly dedupService: IntegrationWebhookDedupService,
    private readonly integrationContext: IntegrationContextService,
  ) {}

  async execute(
    payload: any,
    context?: { connection?: ResolvedIntegrationContext; prependAgentNameOnOutbound?: boolean },
  ) {
    const messagePayload = this.extractMessagePayload(payload);
    const normalizedMessageType = this.normalizeMessageType(messagePayload.messageType);
    if (messagePayload.isPrivateNote) {
      return;
    }

    // Ignora mensagens que nao foram enviadas pelo agente (outgoing/template)
    if (normalizedMessageType !== 'outgoing' && normalizedMessageType !== 'template') {
      return;
    }

    this.logger.log(JSON.stringify({
      flow: 'chatwoot_to_evolution',
      stage: 'payload_normalized',
      messageId: messagePayload.messageId ?? null,
      messageType: messagePayload.messageType ?? null,
      chatwootConversationId: messagePayload.chatwootConversationId ?? null,
      hasContent: Boolean(messagePayload.content),
      contentLength: messagePayload.content?.length ?? 0,
      hasAttachment: messagePayload.attachments.length > 0,
      isPrivateNote: messagePayload.isPrivateNote,
    }));

    const content = this.buildOutboundContent(
      messagePayload.content,
      messagePayload.senderName,
      context?.prependAgentNameOnOutbound === true,
    );
    const messageId = messagePayload.messageId;
    const chatwootConversationId = messagePayload.chatwootConversationId;
    const attachments = messagePayload.attachments;
    const hasAttachment = attachments && attachments.length > 0;
    if ((!content && !hasAttachment) || !chatwootConversationId) {
      this.logger.warn(JSON.stringify({
        flow: 'chatwoot_to_evolution',
        stage: 'ignored_incomplete_payload',
        messageId,
        chatwootConversationId: chatwootConversationId ?? null,
        hasContent: Boolean(content),
        hasAttachment: Boolean(hasAttachment),
      }));
      return;
    }

    if (messageId) {
      const dedupeClaimed = await this.dedupService.claim(
        'chatwoot_outbound',
        `message:${messageId}:${hasAttachment ? 'media' : 'text'}`,
        chatwootConversationId,
        300
      );
      if (!dedupeClaimed) {
        this.logger.debug(JSON.stringify({
          flow: 'chatwoot_to_evolution',
          stage: 'dedup_skipped',
          messageId,
          chatwootConversationId,
        }));
        return;
      }
    }

    // Busca o telefone do cliente usando o ID da conversa do Chatwoot
    const resolvedConnection =
      context?.connection ??
      await this.integrationContext.resolveForChatwootWebhook(payload);

    let link = resolvedConnection
      ? await this.prisma.conversationLink.findUnique({
          where: {
            connectionKey_chatwootConversationId: {
              connectionKey: resolvedConnection.connectionKey,
              chatwootConversationId,
            },
          },
        })
      : await this.prisma.conversationLink.findFirst({
          where: { chatwootConversationId },
        });

    if (!link && resolvedConnection) {
      link = await this.prisma.conversationLink.findFirst({
        where: { chatwootConversationId },
      });
      if (link) {
        this.logger.warn(JSON.stringify({
          flow: 'chatwoot_to_evolution',
          stage: 'fallback_link_resolution',
          messageId,
          chatwootConversationId,
          resolvedConnectionKey: resolvedConnection.connectionKey,
          fallbackConnectionKey: link.connectionKey,
        }));
      }
    }

    if (!link) {
      const fallbackContactIdentifier = this.extractContactIdentifierFromPayload(payload);
      const fallbackPhone =
        this.extractPhoneFromPayload(payload) ??
        await this.resolvePhoneFromConversationDetails(resolvedConnection, chatwootConversationId);
      if (!fallbackPhone) {
        this.logger.warn(JSON.stringify({
          flow: 'chatwoot_to_evolution',
          stage: 'link_not_found',
          messageId,
          chatwootConversationId,
          chatwootContactId: fallbackContactIdentifier,
        }));
        return;
      }

      const fallbackConnection = resolvedConnection;
      if (!fallbackConnection) {
        this.logger.warn(JSON.stringify({
          flow: 'chatwoot_to_evolution',
          stage: 'connection_not_resolved_for_phone_fallback',
          messageId,
          chatwootConversationId,
          whatsappNumber: fallbackPhone,
        }));
        return;
      }

      link = await this.persistFallbackConversationLink(
        fallbackConnection,
        fallbackPhone,
        chatwootConversationId,
        fallbackContactIdentifier,
      );

      this.logger.warn(JSON.stringify({
        flow: 'chatwoot_to_evolution',
        stage: 'link_resolved_from_payload',
        messageId,
        chatwootConversationId,
        whatsappNumber: fallbackPhone,
        chatwootContactId: fallbackContactIdentifier,
      }));
    }

    const resolvedLink = await this.enrichLinkWithSiblingConfirmedNumbers(link);
    const phone = this.resolvePreferredOutboundWhatsappNumber(resolvedLink);
    this.logger.log(JSON.stringify({
      flow: 'chatwoot_to_evolution',
      stage: 'link_resolved',
      messageId,
      chatwootConversationId,
      whatsappNumber: phone,
      storedWhatsappNumber: resolvedLink.whatsappNumber,
      lastInboundWhatsappNumber: this.toOptionalString((resolvedLink as any).lastInboundWhatsappNumber) ?? null,
      lastSuccessfulOutboundWhatsappNumber:
        this.toOptionalString((resolvedLink as any).lastSuccessfulOutboundWhatsappNumber) ?? null,
      siblingDerivedInboundWhatsappNumber:
        this.toOptionalString((resolvedLink as any).siblingDerivedInboundWhatsappNumber) ?? null,
      siblingDerivedSuccessfulOutboundWhatsappNumber:
        this.toOptionalString((resolvedLink as any).siblingDerivedSuccessfulOutboundWhatsappNumber) ?? null,
      connectionKey: resolvedLink.connectionKey,
      chatwootContactId: resolvedLink.chatwootContactId,
    }));

    this.logger.log(JSON.stringify({
      flow: 'chatwoot_to_evolution',
      stage: 'sending',
      messageId,
      chatwootConversationId,
      whatsappNumber: phone,
    }));

    // Se houver arquivo anexado pelo atendente do Chatwoot
    if (hasAttachment) {
      const attachment = attachments[0];
      const fileType = attachment?.file_type || attachment?.data?.content_type || 'document';
      const fileName = attachment?.data?.filename || attachment?.file_name || 'arquivo';

      const linkContext =
        resolvedConnection ??
        await this.integrationContext.resolveByConnectionKey(link.connectionKey);
      if (!linkContext) {
        this.logger.warn(JSON.stringify({
          flow: 'chatwoot_to_evolution',
          stage: 'connection_not_resolved_for_media',
          messageId,
          chatwootConversationId,
          whatsappNumber: phone,
          connectionKey: link.connectionKey,
        }));
        return;
      }

      let mediaPayload: { dataUrl: string; mimetype: string; filename: string } | null = null;
      try {
        mediaPayload = await this.resolveAttachmentPayloadWithRetry(
          linkContext.chatwoot,
          attachment,
          {
            messageId,
            chatwootConversationId,
            attachmentId: attachment?.id?.toString?.() ?? null,
          },
        );
      } catch (error: any) {
        this.logger.warn(JSON.stringify({
          flow: 'chatwoot_to_evolution',
          stage: 'attachment_download_failed',
          messageId,
          chatwootConversationId,
          attachmentId: attachment?.id?.toString?.() ?? null,
          attachmentType: fileType,
          attachmentFileName: fileName,
          error: error?.message ?? 'unknown_error',
        }));
        return;
      }

      if (!mediaPayload?.dataUrl) {
        this.logger.warn(JSON.stringify({
          flow: 'chatwoot_to_evolution',
          stage: 'missing_attachment_url',
          messageId,
          chatwootConversationId,
          attachmentId: attachment?.id?.toString?.() ?? null,
          attachmentType: fileType,
          attachmentFileName: fileName,
        }));
        return;
      }

      this.logger.log(JSON.stringify({
        flow: 'chatwoot_to_evolution',
        stage: 'attachment_reused_without_r2_copy',
        messageId,
        chatwootConversationId,
        attachmentId: attachment?.id?.toString?.() ?? null,
        mimetype: mediaPayload.mimetype || fileType,
        filename: mediaPayload.filename || fileName,
      }));

      const sendResult = await this.evolutionClient.sendMedia(
        linkContext.evolution,
        phone,
        mediaPayload.dataUrl,
        mediaPayload.mimetype || fileType,
        mediaPayload.filename || fileName,
        content || '',
        messageId ?? undefined,
      );
      await this.reconcileWhatsappNumberIfNeeded(
        link,
        phone,
        sendResult.resolvedWhatsappNumber,
        linkContext,
        messageId,
        chatwootConversationId,
      );
      this.logger.log(JSON.stringify({
        flow: 'chatwoot_to_evolution', stage: 'sent_media', messageId, providerMessageId: sendResult.messageId, chatwootConversationId, whatsappNumber: sendResult.resolvedWhatsappNumber ?? phone,
      }));

      if (sendResult.messageId && messageId) {
        try {
          await this.prisma.messageLink.create({
            data: {
              chatwootMessageId: messageId,
              chatwootConversationId: chatwootConversationId,
              evolutionMessageId: sendResult.messageId,
              companyId: link.companyId ?? null,
              connectionId: link.connectionId ?? null,
              connectionKey: link.connectionKey,
            }
          });
        } catch (e: any) { /* ignora erro caso a mensagem ja esteja vinculada */ }
      }

      return; // Encerra, pois sendMedia ja envia texto junto (caption)
    }

    // Dispara para o WhatsApp
    const linkContext =
      resolvedConnection ??
      await this.integrationContext.resolveByConnectionKey(link.connectionKey);
    if (!linkContext) {
      this.logger.warn(JSON.stringify({
        flow: 'chatwoot_to_evolution',
        stage: 'connection_not_resolved',
        messageId,
        chatwootConversationId,
        whatsappNumber: phone,
        connectionKey: link.connectionKey,
      }));
      return;
    }

    const outboundContent = content ?? '';
    let sendResult: { messageId?: string; resolvedWhatsappNumber?: string };
    try {
      sendResult = await this.evolutionClient.sendTextMessage(
        linkContext.evolution,
        phone,
        outboundContent,
        messageId ?? undefined,
      );
    } catch (error: any) {
      const knownProviderCode =
        error instanceof EvolutionOutboundError ? error.code : null;
      const fallbackWhatsappNumber =
        knownProviderCode === 'WHATSAPP_NUMBER_NOT_REGISTERED'
          ? this.buildLegacyBrazilianNumberVariant(phone)
          : null;
      this.logger.error(JSON.stringify({
        flow: 'chatwoot_to_evolution',
        stage:
          knownProviderCode === 'WHATSAPP_NUMBER_NOT_REGISTERED'
            ? 'send_failed_unregistered_number'
            : 'send_failed',
        messageId,
        chatwootConversationId,
        whatsappNumber: phone,
        originalWhatsappNumber: phone,
        fallbackWhatsappNumber,
        connectionKey: resolvedLink.connectionKey,
        error: error?.message ?? 'unknown_error',
        providerCode: knownProviderCode,
        providerStatus:
          error instanceof EvolutionOutboundError ? error.providerStatus : null,
        retryable:
          error instanceof EvolutionOutboundError ? error.retryable : null,
      }));
      if (knownProviderCode === 'WHATSAPP_NUMBER_NOT_REGISTERED') {
        const businessError = new Error('Numero nao cadastrado no WhatsApp.') as Error & {
          code?: string;
        };
        businessError.name = 'KnownOutboundMessageError';
        businessError.code = knownProviderCode;
        throw businessError;
      }
      throw error;
    }
    await this.reconcileWhatsappNumberIfNeeded(
      resolvedLink,
      phone,
      sendResult.resolvedWhatsappNumber,
      linkContext,
      messageId,
      chatwootConversationId,
    );
    this.logger.log(JSON.stringify({
      flow: 'chatwoot_to_evolution',
      stage: 'sent',
      messageId,
      providerMessageId: sendResult.messageId,
      chatwootConversationId,
      whatsappNumber: sendResult.resolvedWhatsappNumber ?? phone,
    }));

    if (sendResult.messageId && messageId) {
      try {
        await this.prisma.messageLink.create({
          data: {
            chatwootMessageId: messageId,
            chatwootConversationId: chatwootConversationId,
            evolutionMessageId: sendResult.messageId,
            companyId: resolvedLink.companyId ?? null,
            connectionId: resolvedLink.connectionId ?? null,
            connectionKey: resolvedLink.connectionKey,
          }
        });
      } catch (e: any) { /* ignora erro caso a mensagem ja esteja vinculada */ }
    }

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

  private extractMessagePayload(payload: any): {
    messageId?: string;
    messageType?: unknown;
    isPrivateNote: boolean;
    content?: string;
    senderName?: string;
    chatwootConversationId?: string;
    attachments: any[];
  } {
    const message = payload?.message && typeof payload.message === 'object' ? payload.message : null;
    const messageId = this.toOptionalString(payload?.id ?? message?.id);
    const conversationMessage = this.findConversationMessage(payload, messageId);
    const attachments = this.toArray(
      payload?.attachments ??
      message?.attachments ??
      conversationMessage?.attachments
    );
    const content = this.resolveOutgoingContent(payload, message);

    return {
      messageId,
      messageType: payload?.message_type ?? message?.message_type,
      isPrivateNote: Boolean(payload?.private ?? message?.private),
      content,
      senderName: this.extractSenderName(payload, message, conversationMessage),
      chatwootConversationId: this.toOptionalString(
        payload?.conversation?.id ??
        payload?.conversation_id ??
        message?.conversation_id ??
        message?.conversation?.id
      ),
      attachments,
    };
  }

  private findConversationMessage(payload: any, messageId?: string): any | null {
    const messages = this.toArray(payload?.conversation?.messages);
    if (messages.length === 0) return null;

    if (messageId) {
      const matchingMessage = messages.find((item: any) => String(item?.id ?? '') === messageId);
      if (matchingMessage) return matchingMessage;
    }

    return messages[0] ?? null;
  }

  private extractPhoneFromPayload(payload: any): string | null {
    const candidates = [
      payload?.conversation?.meta?.sender?.phone_number,
      payload?.conversation?.meta?.sender?.identifier,
      payload?.conversation?.meta?.sender?.pubsub_token,
      payload?.conversation?.meta?.channel,
      payload?.conversation?.contact?.identifier,
      payload?.conversation?.contact?.phone_number,
      payload?.conversation?.contact?.id,
      payload?.conversation?.contact_inbox?.source_id,
      payload?.conversation?.contact_inbox?.contact_id,
      payload?.contact?.phone_number,
      payload?.contact?.identifier,
      payload?.sender?.phone_number,
      payload?.sender?.identifier,
      payload?.message?.sender?.phone_number,
      payload?.message?.sender?.identifier,
    ];

    for (const candidate of candidates) {
      const digits = String(candidate ?? '').replace(/\D/g, '');
      if (digits.length >= 10) {
        return digits;
      }
    }

    return null;
  }

  private extractContactIdentifierFromPayload(payload: any): string {
    const candidates = [
      payload?.conversation?.contact_inbox?.source_id,
      payload?.conversation?.meta?.sender?.source_id,
      payload?.sender?.source_id,
      payload?.contact_inbox?.source_id,
      payload?.message?.source_id,
    ];

    for (const candidate of candidates) {
      const value = this.toOptionalString(candidate);
      if (value) return value;
    }

    return 'unknown';
  }

  private async resolvePhoneFromConversationDetails(
    connection: ResolvedIntegrationContext | null | undefined,
    chatwootConversationId: string,
  ): Promise<string | null> {
    if (!connection) return null;

    try {
      const conversation = await this.chatwootClient.getConversationDetails(
        connection.chatwoot,
        chatwootConversationId,
      );

      const candidates = [
        conversation?.meta?.sender?.phone_number,
        conversation?.meta?.sender?.identifier,
        conversation?.meta?.channel,
      ];

      for (const candidate of candidates) {
        const digits = String(candidate ?? '').replace(/\D/g, '');
        if (digits.length >= 10) {
          this.logger.warn(JSON.stringify({
            flow: 'chatwoot_to_evolution',
            stage: 'phone_resolved_from_conversation',
            chatwootConversationId,
            whatsappNumber: digits,
          }));
          return digits;
        }
      }
    } catch (error: any) {
      this.logger.warn(JSON.stringify({
        flow: 'chatwoot_to_evolution',
        stage: 'conversation_lookup_failed',
        chatwootConversationId,
        error: error?.message ?? 'unknown_error',
      }));
    }

    return null;
  }

  private buildLegacyBrazilianNumberVariant(number: string): string | null {
    const digits = String(number ?? '').replace(/\D/g, '');
    if (!/^55\d{2}9\d{8}$/.test(digits)) {
      return null;
    }

    return `${digits.slice(0, 4)}${digits.slice(5)}`;
  }

  private resolvePreferredOutboundWhatsappNumber(link: {
    whatsappNumber: string;
    lastInboundWhatsappNumber?: string | null;
    lastSuccessfulOutboundWhatsappNumber?: string | null;
    siblingDerivedInboundWhatsappNumber?: string | null;
    siblingDerivedSuccessfulOutboundWhatsappNumber?: string | null;
  }): string {
    const candidates = [
      this.toOptionalString(link.lastSuccessfulOutboundWhatsappNumber),
      this.toOptionalString(link.siblingDerivedSuccessfulOutboundWhatsappNumber),
      this.toOptionalString(link.lastInboundWhatsappNumber),
      this.toOptionalString(link.siblingDerivedInboundWhatsappNumber),
      this.toOptionalString(link.whatsappNumber),
    ].filter((value, index, list): value is string => Boolean(value) && list.indexOf(value as string) === index);

    return candidates[0] ?? link.whatsappNumber;
  }

  private async enrichLinkWithSiblingConfirmedNumbers(link: {
    id: string;
    companyId: string | null;
    connectionId: string | null;
    connectionKey: string;
    whatsappNumber: string;
    chatwootContactId: string;
    chatwootConversationId: string;
    lastInboundWhatsappNumber?: string | null;
    lastSuccessfulOutboundWhatsappNumber?: string | null;
  }) {
    if (!link.chatwootContactId || link.chatwootContactId === 'unknown') {
      return link;
    }

    const siblingLinks = await this.prisma.conversationLink.findMany({
      where: {
        connectionKey: link.connectionKey,
        chatwootContactId: link.chatwootContactId,
        id: { not: link.id },
      },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        lastInboundWhatsappNumber: true,
        lastSuccessfulOutboundWhatsappNumber: true,
      },
    } as any);

    const siblingDerivedSuccessfulOutboundWhatsappNumber = this.toOptionalString(
      siblingLinks
        .map((item: any) => item?.lastSuccessfulOutboundWhatsappNumber)
        .find((value: unknown) => this.toOptionalString(value)),
    );
    const siblingDerivedInboundWhatsappNumber = this.toOptionalString(
      siblingLinks
        .map((item: any) => item?.lastInboundWhatsappNumber)
        .find((value: unknown) => this.toOptionalString(value)),
    );

    return {
      ...link,
      siblingDerivedInboundWhatsappNumber,
      siblingDerivedSuccessfulOutboundWhatsappNumber,
    };
  }

  private async persistFallbackConversationLink(
    connection: ResolvedIntegrationContext,
    whatsappNumber: string,
    chatwootConversationId: string,
    chatwootContactId: string,
  ) {
    const existingLink =
      await this.prisma.conversationLink.findUnique({
        where: {
          connectionKey_whatsappNumber: {
            connectionKey: connection.connectionKey,
            whatsappNumber,
          },
        },
      }) ??
      await this.prisma.conversationLink.findFirst({
        where: {
          connectionKey: connection.connectionKey,
          chatwootConversationId,
        },
      }) ??
      (chatwootContactId && chatwootContactId !== 'unknown'
        ? await this.prisma.conversationLink.findFirst({
            where: {
              connectionKey: connection.connectionKey,
              chatwootContactId,
            },
            orderBy: { createdAt: 'desc' },
          })
        : null);

    if (existingLink && existingLink.chatwootConversationId !== chatwootConversationId) {
      this.logger.warn(JSON.stringify({
        flow: 'chatwoot_to_evolution',
        stage: 'conversation_link_rebound',
        connectionKey: connection.connectionKey,
        whatsappNumber,
        previousConversationId: existingLink.chatwootConversationId,
        nextConversationId: chatwootConversationId,
        chatwootContactId: existingLink.chatwootContactId,
      }));

      return this.prisma.conversationLink.update({
        where: { id: existingLink.id },
        data: {
          chatwootConversationId,
          chatwootContactId:
            existingLink.chatwootContactId && existingLink.chatwootContactId !== 'unknown'
              ? existingLink.chatwootContactId
              : chatwootContactId,
        },
      });
    }

    if (existingLink) {
      return this.prisma.conversationLink.update({
        where: { id: existingLink.id },
        data: {
          chatwootConversationId,
          chatwootContactId:
            existingLink.chatwootContactId && existingLink.chatwootContactId !== 'unknown'
              ? existingLink.chatwootContactId
              : chatwootContactId,
        },
      });
    }

    return this.prisma.conversationLink.create({
      data: {
        companyId: connection.companyId ?? null,
        connectionId: connection.connectionId,
        connectionKey: connection.connectionKey,
        whatsappNumber,
        chatwootConversationId,
        chatwootContactId,
      },
    });
  }

  private async reconcileWhatsappNumberIfNeeded(
    link: {
      id: string;
      companyId: string | null;
      connectionId: string | null;
      connectionKey: string;
      whatsappNumber: string;
      chatwootContactId: string;
      chatwootConversationId: string;
    },
    originalWhatsappNumber: string,
    resolvedWhatsappNumber: string | undefined,
    connection: ResolvedIntegrationContext,
    messageId: string | undefined,
    chatwootConversationId: string,
  ) {
    const normalizedResolved = String(resolvedWhatsappNumber ?? '').trim();
    if (!normalizedResolved || normalizedResolved === originalWhatsappNumber) {
      return;
    }

    await this.prisma.conversationLink.update({
      where: { id: link.id },
      data: {
        whatsappNumber: normalizedResolved,
        lastSuccessfulOutboundWhatsappNumber: normalizedResolved,
      },
    });

    const linkedContact = await this.prisma.companyContact.findFirst({
      where: { whatsapp: originalWhatsappNumber },
      orderBy: { updatedAt: 'desc' },
    });

    if (linkedContact) {
      await this.prisma.companyContact.update({
        where: { id: linkedContact.id },
        data: { whatsapp: normalizedResolved },
      });
    }

    const formattedResolvedPhone = normalizedResolved.startsWith('+')
      ? normalizedResolved
      : `+${normalizedResolved}`;
    try {
      await this.chatwootClient.updateContact(
        connection.chatwoot,
        link.chatwootContactId,
        { phone_number: formattedResolvedPhone },
      );
    } catch (error: any) {
      this.logger.warn(JSON.stringify({
        flow: 'chatwoot_to_evolution',
        stage: 'phone_reconciliation_chatwoot_update_failed',
        messageId: messageId ?? null,
        chatwootConversationId,
        chatwootContactId: link.chatwootContactId,
        previousWhatsappNumber: originalWhatsappNumber,
        resolvedWhatsappNumber: normalizedResolved,
        error: error?.message ?? 'unknown_error',
      }));
    }

    this.logger.warn(JSON.stringify({
      flow: 'chatwoot_to_evolution',
      stage: 'phone_reconciled_with_provider',
      messageId: messageId ?? null,
      chatwootConversationId,
      chatwootContactId: link.chatwootContactId,
      previousWhatsappNumber: originalWhatsappNumber,
      resolvedWhatsappNumber: normalizedResolved,
      connectionKey: link.connectionKey,
      companyId: link.companyId,
      connectionId: link.connectionId,
      contactUpdated: Boolean(linkedContact),
    }));

    link.whatsappNumber = normalizedResolved;
    (link as any).lastSuccessfulOutboundWhatsappNumber = normalizedResolved;
  }

  private toArray<T>(value: T | T[] | null | undefined): T[] {
    if (Array.isArray(value)) return value;
    if (value == null) return [];
    return [value];
  }

  private toOptionalString(value: unknown): string | undefined {
    const normalized = String(value ?? '').trim();
    return normalized.length > 0 ? normalized : undefined;
  }

  private async resolveAttachmentPayloadWithRetry(
    config: Parameters<ChatwootClient['resolveAttachmentPayload']>[0],
    attachment: any,
    context: {
      messageId?: string;
      chatwootConversationId: string;
      attachmentId: string | null;
    },
  ): Promise<{ dataUrl: string; mimetype: string; filename: string } | null> {
    const retryDelaysMs = [0, 700, 1500, 3000, 5000];
    let lastError: any;

    for (let attemptIndex = 0; attemptIndex < retryDelaysMs.length; attemptIndex += 1) {
      const delayMs = retryDelaysMs[attemptIndex];
      if (delayMs > 0) {
        await this.sleep(delayMs);
      }

      try {
        return await this.chatwootClient.resolveAttachmentPayload(config, attachment);
      } catch (error: any) {
        lastError = error;
        const isLastAttempt = attemptIndex === retryDelaysMs.length - 1;
        if (isLastAttempt || !this.shouldRetryAttachmentDownload(error)) {
          throw error;
        }

        this.logger.warn(JSON.stringify({
          flow: 'chatwoot_to_evolution',
          stage: 'attachment_download_retry',
          messageId: context.messageId ?? null,
          chatwootConversationId: context.chatwootConversationId,
          attachmentId: context.attachmentId,
          attempt: attemptIndex + 1,
          nextDelayMs: retryDelaysMs[attemptIndex + 1],
          error: this.truncateLog(error?.message ?? 'unknown_error'),
        }));
      }
    }

    throw lastError;
  }

  private shouldRetryAttachmentDownload(error: any): boolean {
    const message = String(error?.message ?? '').toLowerCase();
    return (
      message.includes('nosuchkey') ||
      message.includes('fetch failed') ||
      message.includes('fetch_failed') ||
      message.includes('404') ||
      message.includes('500') ||
      message.includes('something went wrong')
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private truncateLog(value: string): string {
    const normalized = String(value ?? '');
    return normalized.length > 600 ? `${normalized.slice(0, 597)}...` : normalized;
  }

  private resolveOutgoingContent(payload: any, message: any): string | undefined {
    const directCandidates = [
      payload?.content,
      message?.content,
      payload?.message?.content,
      payload?.content_attributes?.message,
      message?.content_attributes?.message,
      payload?.content_attributes?.text,
      message?.content_attributes?.text,
      payload?.conversation?.last_non_activity_message?.content,
      payload?.conversation?.messages?.[0]?.content,
    ];

    for (const candidate of directCandidates) {
      const normalized = this.normalizeMessageText(candidate);
      if (normalized) return normalized;
    }

    const templateCandidates = [
      payload?.content_attributes?.submitted_values,
      message?.content_attributes?.submitted_values,
      payload?.content_attributes?.items,
      message?.content_attributes?.items,
    ];

    for (const candidate of templateCandidates) {
      const normalized = this.normalizeStructuredContent(candidate);
      if (normalized) return normalized;
    }

    return undefined;
  }

  private normalizeMessageText(value: unknown): string | undefined {
    const raw = String(value ?? '').trim();
    if (!raw) return undefined;

    const withoutTags = raw
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]{2,}/g, ' ')
      .trim();

    return withoutTags || undefined;
  }

  private normalizeStructuredContent(value: unknown): string | undefined {
    if (Array.isArray(value)) {
      const parts = value
        .map((item) => this.normalizeStructuredContent(item))
        .filter(Boolean);
      return parts.length ? parts.join('\n') : undefined;
    }

    if (value && typeof value === 'object') {
      const entries = Object.entries(value as Record<string, unknown>)
        .map(([key, entryValue]) => {
          const normalizedValue = this.normalizeStructuredContent(entryValue);
          return normalizedValue ? `${key}: ${normalizedValue}` : null;
        })
        .filter(Boolean);
      return entries.length ? entries.join('\n') : undefined;
    }

    return this.normalizeMessageText(value);
  }

  private buildOutboundContent(
    content: string | undefined,
    senderName: string | undefined,
    prependAgentNameOnOutbound: boolean,
  ): string | undefined {
    const normalizedContent = this.normalizeMessageText(content);
    if (!normalizedContent) return normalizedContent;
    if (!prependAgentNameOnOutbound) return normalizedContent;

    const normalizedSenderName = this.normalizeAgentName(senderName);
    if (!normalizedSenderName) return normalizedContent;

    const legacyPrefix = `Nome do atendente: ${normalizedSenderName}`;
    const boldPrefix = `*${normalizedSenderName}:*`;
    if (
      normalizedContent.toLowerCase().startsWith(legacyPrefix.toLowerCase()) ||
      normalizedContent.startsWith(boldPrefix)
    ) {
      const withoutLegacyPrefix = normalizedContent
        .replace(new RegExp(`^${this.escapeRegExp(legacyPrefix)}\\s*`, 'i'), '')
        .trim();
      return withoutLegacyPrefix ? `${boldPrefix} ${withoutLegacyPrefix}` : boldPrefix;
    }

    return `${boldPrefix} ${normalizedContent}`;
  }

  private extractSenderName(payload: any, message: any, conversationMessage: any): string | undefined {
    const sender =
      payload?.sender ??
      message?.sender ??
      conversationMessage?.sender ??
      payload?.user ??
      message?.user ??
      conversationMessage?.user;

    const candidates = [
      sender?.available_name,
      sender?.display_name,
      sender?.name,
      payload?.conversation?.meta?.assignee?.available_name,
      payload?.conversation?.meta?.assignee?.display_name,
      sender?.email,
      payload?.conversation?.meta?.assignee?.name,
    ];

    for (const candidate of candidates) {
      const normalized = this.normalizeAgentName(candidate);
      if (normalized) return normalized;
    }

    return undefined;
  }

  private normalizeAgentName(value: unknown): string | undefined {
    const normalized = String(value ?? '').trim();
    return normalized || undefined;
  }

  private escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

}
