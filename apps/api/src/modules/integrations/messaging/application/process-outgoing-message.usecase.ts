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
    // Ignora mensagens que não foram enviadas pelo agente (outgoing)
    if (payload.message_type !== 'outgoing') return;

    const content = payload.content;
    const chatwootConversationId = payload.conversation?.id?.toString();

    if (!content || !chatwootConversationId) return;

    // Busca o telefone do cliente usando o ID da conversa do Chatwoot
    const link = await this.prisma.conversationLink.findUnique({
      where: { chatwootConversationId }
    });

    if (!link) {
      this.logger.warn(`Chatwoot -> WhatsApp: Vínculo não encontrado para a conversa ${chatwootConversationId}`);
      return;
    }

    const phone = link.whatsappNumber;

    this.logger.log(`Chatwoot -> WhatsApp: Respondendo para ${phone} via Evolution`);

    // Dispara para o WhatsApp
    await this.evolutionClient.sendTextMessage(phone, content);
  }
}