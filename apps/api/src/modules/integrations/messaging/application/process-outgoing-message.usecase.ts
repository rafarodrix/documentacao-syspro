import { Injectable, Logger } from '@nestjs/common';
import { EvolutionClient } from '../../evolution/evolution.client';
import { PrismaService } from '../../../../prisma/prisma.service';

@Injectable()
export class ProcessOutgoingMessageUseCase {
  private readonly logger = new Logger(ProcessOutgoingMessageUseCase.name);

  constructor(
    private readonly evolutionClient: EvolutionClient,
    private readonly prisma: PrismaService
  ) {}

  async execute(payload: any) {
    // Ignora mensagens que nao foram enviadas pelo agente (outgoing)
    if (payload.message_type !== 'outgoing') return;

    const content = payload.content;
    const messageId = payload?.id?.toString?.();
    const chatwootConversationId = payload.conversation?.id?.toString();

    const attachments = payload.attachments;
    const hasAttachment = attachments && attachments.length > 0;
    if (!content && !hasAttachment || !chatwootConversationId) return;

    // Busca o telefone do cliente usando o ID da conversa do Chatwoot
    const link = await this.prisma.conversationLink.findUnique({
      where: { chatwootConversationId }
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
      
      const sendResult = await this.evolutionClient.sendMedia(phone, mediaUrl, fileType, fileName, content || '');
      this.logger.log(JSON.stringify({
        flow: 'chatwoot_to_evolution', stage: 'sent_media', messageId, providerMessageId: sendResult.messageId, chatwootConversationId, whatsappNumber: phone,
      }));

      if (sendResult.messageId) {
        try {
          await (this.prisma as any).messageLink.create({
            data: {
              chatwootMessageId: messageId,
              chatwootConversationId: chatwootConversationId,
              evolutionMessageId: sendResult.messageId,
            }
          });
        } catch (e: any) { /* ignora erro caso a tabela ainda nao exista */ }
      }

      return; // Encerra, pois sendMedia ja envia texto junto (caption)
    }

    // Dispara para o WhatsApp
    const sendResult = await this.evolutionClient.sendTextMessage(phone, content);
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
        await (this.prisma as any).messageLink.create({
          data: {
            chatwootMessageId: messageId,
            chatwootConversationId: chatwootConversationId,
            evolutionMessageId: sendResult.messageId,
          }
        });
      } catch (e: any) { /* ignora erro caso a tabela ainda nao exista */ }
    }
  }
}
