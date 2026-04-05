import { Injectable, Logger } from '@nestjs/common';
import { ChatwootClient } from '../../chatwoot/infrastructure/chatwoot.client';
import { PrismaService } from '../../../../prisma/prisma.service';

@Injectable()
export class ProcessIncomingMessageUseCase {
  private readonly logger = new Logger(ProcessIncomingMessageUseCase.name);

  constructor(
    private readonly chatwootClient: ChatwootClient,
    private readonly prisma: PrismaService
  ) {}

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
        // 1. Busca se já temos uma conversa ativa para este número
        let link = await this.prisma.conversationLink.findUnique({
          where: { whatsappNumber: phone }
        });

        let contactIdentifier = link?.chatwootContactId;
        let conversationId = link?.chatwootConversationId;

        // 2. Se não existir o vínculo, cria tudo no Chatwoot e salva no banco
        if (!link) {
          const contactResponse = (await this.chatwootClient.createOrFindContact(phone, pushName)) as any;
          contactIdentifier = contactResponse?.payload?.contact?.source_id?.toString();

          if (!contactIdentifier) throw new Error('Não foi possível resolver o source_id do contato no Chatwoot');

          const convResponse = (await this.chatwootClient.createConversation(contactIdentifier)) as any;
          conversationId = convResponse?.id?.toString();

          link = await this.prisma.conversationLink.create({
            data: {
              whatsappNumber: phone,
              chatwootContactId: contactIdentifier!,
              chatwootConversationId: conversationId!
            }
          });
        }

        // 3. Cria Mensagem na Inbox do Chatwoot usando os IDs persistidos
        await this.chatwootClient.createIncomingMessage(contactIdentifier!, conversationId!, textContent);
        
      } catch (error: any) {
        this.logger.error(`Erro ao processar incoming message: ${error.message}`);
      }
    }
  }
}