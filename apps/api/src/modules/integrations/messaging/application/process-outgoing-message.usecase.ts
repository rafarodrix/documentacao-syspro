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

    if (!content || !chatwootConversationId) return;

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
  }
}
