import { Injectable, Logger } from '@nestjs/common';
import { ChatwootClient } from '../../chatwoot/infrastructure/chatwoot.client';
// import { PrismaService } from '...'; // Para persistência futura

@Injectable()
export class ProcessIncomingMessageUseCase {
  private readonly logger = new Logger(ProcessIncomingMessageUseCase.name);

  constructor(private readonly chatwootClient: ChatwootClient) {}

  async execute(payload: any) {
    const messages = Array.isArray(payload) ? payload : (payload?.messages || [payload?.message || payload]);

    for (const msg of messages) {
      if (!msg || msg?.key?.fromMe) continue;

      const remoteJid = msg?.key?.remoteJid;
      if (!remoteJid) continue;

      const phone = remoteJid.replace('@s.whatsapp.net', '');
      const pushName = msg?.pushName || 'Cliente WhatsApp';
      
      let textContent = '';
      if (msg?.message?.conversation) textContent = msg.message.conversation;
      else if (msg?.message?.extendedTextMessage?.text) textContent = msg.message.extendedTextMessage.text;
      else textContent = '[Mensagem de mídia recebida]';

      this.logger.log(`WhatsApp -> Chatwoot: ${phone} disse: ${textContent}`);

      try {
        // 1. Resolve Contato no Chatwoot
        const contactResponse = (await this.chatwootClient.createOrFindContact(phone, pushName)) as any;
        const contactIdentifier = contactResponse?.payload?.contact?.source_id;

        if (!contactIdentifier) throw new Error('Não foi possível resolver o source_id do contato no Chatwoot');

        // 2. Resolve/Cria Conversa
        const convResponse = (await this.chatwootClient.createConversation(contactIdentifier)) as any;
        const conversationId = convResponse?.id;

        // TODO: Mapear no banco de dados (ConversationLink)
        // await this.prisma.conversationLink.upsert({ ... })

        // 3. Cria Mensagem na Inbox
        await this.chatwootClient.createIncomingMessage(contactIdentifier, conversationId, textContent);
        
      } catch (error: any) {
        this.logger.error(`Erro ao processar incoming message: ${error.message}`);
      }
    }
  }
}