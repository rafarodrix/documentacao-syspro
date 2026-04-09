import { Injectable, Logger } from '@nestjs/common';
import { EvolutionClient } from '../../evolution/evolution.client';
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

  async execute(payload: any, context?: { connection?: ResolvedIntegrationContext }) {
    const messagePayload = this.extractMessagePayload(payload);
    const normalizedMessageType = this.normalizeMessageType(messagePayload.messageType);
    if (messagePayload.isPrivateNote) {
      this.logger.debug(JSON.stringify({
        flow: 'chatwoot_to_evolution',
        stage: 'ignored_private_note',
        messageId: messagePayload.messageId ?? null,
      }));
      return;
    }

    // Ignora mensagens que nao foram enviadas pelo agente (outgoing/template)
    if (normalizedMessageType !== 'outgoing' && normalizedMessageType !== 'template') {
      this.logger.debug(JSON.stringify({
        flow: 'chatwoot_to_evolution',
        stage: 'ignored_message_type',
        messageId: messagePayload.messageId ?? null,
        messageType: messagePayload.messageType ?? null,
      }));
      return;
    }

    const content = messagePayload.content;
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

    const phone = link.whatsappNumber;

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
      const mediaUrl = attachment?.data_url ?? attachment?.thumb_url ?? attachment?.download_url;
      const fileType = attachment.file_type || 'document';
      const fileName = attachment.data?.filename || 'arquivo';

      if (!mediaUrl) {
        this.logger.warn(JSON.stringify({
          flow: 'chatwoot_to_evolution',
          stage: 'missing_attachment_url',
          messageId,
          chatwootConversationId,
          attachmentId: attachment?.id?.toString?.() ?? null,
        }));
        return;
      }
      
      const linkContext =
        resolvedConnection ??
        await this.integrationContext.resolveByConnectionKey(link.connectionKey);
      if (!linkContext) {
        this.logger.warn(`Conexao nao resolvida para envio de midia da conversa ${chatwootConversationId}`);
        return;
      }

      const sendResult = await this.evolutionClient.sendMedia(
        linkContext.evolution,
        phone,
        mediaUrl,
        fileType,
        fileName,
        content || ''
      );
      this.logger.log(JSON.stringify({
        flow: 'chatwoot_to_evolution', stage: 'sent_media', messageId, providerMessageId: sendResult.messageId, chatwootConversationId, whatsappNumber: phone,
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
      this.logger.warn(`Conexao nao resolvida para envio da conversa ${chatwootConversationId}`);
      return;
    }

    const outboundContent = content ?? '';
    const sendResult = await this.evolutionClient.sendTextMessage(linkContext.evolution, phone, outboundContent);
    this.logger.log(JSON.stringify({
      flow: 'chatwoot_to_evolution',
      stage: 'sent',
      messageId,
      providerMessageId: sendResult.messageId,
      chatwootConversationId,
      whatsappNumber: phone,
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
    chatwootConversationId?: string;
    attachments: any[];
  } {
    const message = payload?.message && typeof payload.message === 'object' ? payload.message : null;
    const attachments = this.toArray(payload?.attachments ?? message?.attachments);

    return {
      messageId: this.toOptionalString(payload?.id ?? message?.id),
      messageType: payload?.message_type ?? message?.message_type,
      isPrivateNote: Boolean(payload?.private ?? message?.private),
      content: this.toOptionalString(payload?.content ?? message?.content),
      chatwootConversationId: this.toOptionalString(
        payload?.conversation?.id ??
        payload?.conversation_id ??
        message?.conversation_id ??
        message?.conversation?.id
      ),
      attachments,
    };
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

  private toArray<T>(value: T | T[] | null | undefined): T[] {
    if (Array.isArray(value)) return value;
    if (value == null) return [];
    return [value];
  }

  private toOptionalString(value: unknown): string | undefined {
    const normalized = String(value ?? '').trim();
    return normalized.length > 0 ? normalized : undefined;
  }
}
