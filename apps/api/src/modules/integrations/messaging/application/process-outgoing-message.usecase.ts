import { Injectable, Logger } from '@nestjs/common';
import { EvolutionClient } from '../../evolution/evolution.client';
import { PrismaService } from '../../../../prisma/prisma.service';
import { IntegrationWebhookDedupService } from './integration-webhook-dedup.service';
import { IntegrationContextService, type ResolvedIntegrationContext } from '../../../settings/integration-context.service';

@Injectable()
export class ProcessOutgoingMessageUseCase {
  private readonly logger = new Logger(ProcessOutgoingMessageUseCase.name);

  constructor(
    private readonly evolutionClient: EvolutionClient,
    private readonly prisma: PrismaService,
    private readonly dedupService: IntegrationWebhookDedupService,
    private readonly integrationContext: IntegrationContextService,
  ) {}

  async execute(payload: any, context?: { connection?: ResolvedIntegrationContext }) {
    // Ignora mensagens que nao foram enviadas pelo agente (outgoing)
    if (payload.message_type !== 'outgoing') return;

    const content = payload.content;
    const messageId = payload?.id?.toString?.();
    const chatwootConversationId = payload.conversation?.id?.toString();

    const attachments = payload.attachments;
    const hasAttachment = attachments && attachments.length > 0;
    if (!content && !hasAttachment || !chatwootConversationId) return;

    if (messageId) {
      const dedupeClaimed = await this.dedupService.claim(
        'chatwoot_outbound',
        `message:${messageId}:${hasAttachment ? 'media' : 'text'}`,
        chatwootConversationId
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

    const link = resolvedConnection
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

    if (!link) {
      this.logger.warn(JSON.stringify({
        flow: 'chatwoot_to_evolution',
        stage: 'link_not_found',
        messageId,
        chatwootConversationId,
      }));
      return;
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
      const mediaUrl = attachment.data_url;
      const fileType = attachment.file_type || 'document';
      const fileName = attachment.data?.filename || 'arquivo';
      
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

      if (sendResult.messageId) {
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

    const sendResult = await this.evolutionClient.sendTextMessage(linkContext.evolution, phone, content);
    this.logger.log(JSON.stringify({
      flow: 'chatwoot_to_evolution',
      stage: 'sent',
      messageId,
      providerMessageId: sendResult.messageId,
      chatwootConversationId,
      whatsappNumber: phone,
    }));

    if (sendResult.messageId) {
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
}
