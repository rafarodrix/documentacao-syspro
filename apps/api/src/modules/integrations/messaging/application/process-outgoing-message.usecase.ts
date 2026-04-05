import { Injectable, Logger } from '@nestjs/common';
import { EvolutionClient } from '../../evolution/infrastructure/evolution.client';
// import { PrismaService } from '...'; // Para persistência futura

@Injectable()
export class ProcessOutgoingMessageUseCase {
  private readonly logger = new Logger(ProcessOutgoingMessageUseCase.name);

  constructor(private readonly evolutionClient: EvolutionClient) {}

  async execute(payload: any) {
    // Ignora mensagens que não foram enviadas pelo agente (outgoing)
    if (payload.message_type !== 'outgoing') return;

    const content = payload.content;
    const chatwootConversationId = payload.conversation?.id;

    if (!content || !chatwootConversationId) return;

    // TODO: Buscar o ConversationLink no banco de dados para descobrir o telefone
    // const link = await this.prisma.conversationLink.findFirst({ where: { chatwootConversationId } });
    // const phone = link.whatsappNumber;
    const phone = "553499999999"; // Fixo para teste - substituir pela busca no banco

    this.logger.log(`Chatwoot -> WhatsApp: Respondendo para ${phone} via Evolution`);

    // Dispara para o WhatsApp
    await this.evolutionClient.sendTextMessage(phone, content);
  }
}