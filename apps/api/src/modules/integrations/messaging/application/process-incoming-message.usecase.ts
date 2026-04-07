import { Injectable, Logger } from '@nestjs/common';
import { ChatwootClient } from '../../chatwoot/chatwoot.client';
import { PrismaService } from '../../../../prisma/prisma.service';

@Injectable()
export class ProcessIncomingMessageUseCase {
  private readonly logger = new Logger(ProcessIncomingMessageUseCase.name);
  private readonly processedMessageIds = new Map<string, number>();
  private readonly processedMessageTtlMs = 10 * 60 * 1000;

  constructor(
    private readonly chatwootClient: ChatwootClient,
    private readonly prisma: PrismaService
  ) {}

  async execute(payload: any) {
    const messages = Array.isArray(payload) ? payload : (payload?.messages || [payload?.message || payload]);
    this.cleanupProcessedMessages();

    for (const msg of messages) {
      if (!msg || msg?.key?.fromMe) continue;

      const messageId = msg?.key?.id?.toString();
      if (messageId && this.isDuplicateMessage(messageId)) {
        this.logger.debug(`Mensagem duplicada ignorada: ${messageId}`);
        continue;
      }

      const remoteJid = msg?.key?.remoteJid;
      if (!remoteJid) continue;
      if (!remoteJid.endsWith('@s.whatsapp.net')) {
        this.logger.debug(`JID nao suportado ignorado: ${remoteJid}`);
        continue;
      }

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
          // Busca no Syspro se esse número já é um contato cadastrado em alguma empresa
          let sysproContact = await this.prisma.companyContact.findFirst({
            where: { whatsapp: phone },
            include: { company: true },
          });

          // Se não existir no banco, cadastra como contato "órfão" para entrar na rotina de vinculação
          if (!sysproContact) {
            sysproContact = await this.prisma.companyContact.create({
              data: {
                name: String(pushName),
                whatsapp: String(phone),
              },
              include: { company: true },
            });
          }

          // Garante ao TypeScript que sysproContact não é nulo a partir deste ponto
          if (!sysproContact) throw new Error('Falha ao processar o contato no banco de dados');

          const contactName = sysproContact.company ? `${sysproContact.name} - ${sysproContact.company.nomeFantasia || sysproContact.company.razaoSocial}` : sysproContact.name;

          const contactResponse = (await this.chatwootClient.createOrFindContact(phone, contactName)) as any;
          contactIdentifier = contactResponse?.payload?.contact?.source_id?.toString();

          if (!contactIdentifier) throw new Error('Não foi possível resolver o source_id do contato no Chatwoot');

          const convResponse = (await this.chatwootClient.createConversation(contactIdentifier)) as any;
          conversationId = convResponse?.id?.toString();

          try {
            link = await this.prisma.conversationLink.create({
              data: {
                whatsappNumber: phone,
                chatwootContactId: contactIdentifier!,
                chatwootConversationId: conversationId!,
              },
            });
          } catch (error: any) {
            // Outra requisição pode ter criado o vinculo em paralelo.
            if (error?.code === 'P2002') {
              link = await this.prisma.conversationLink.findUnique({
                where: { whatsappNumber: phone },
              });
            } else {
              throw error;
            }
          }

          if (!link) {
            throw new Error('Falha ao recuperar vinculo de conversa apos concorrencia');
          }

          contactIdentifier = link.chatwootContactId;
          conversationId = link.chatwootConversationId;
        }

        // 3. Cria Mensagem na Inbox do Chatwoot usando os IDs persistidos
        await this.chatwootClient.createIncomingMessage(contactIdentifier!, conversationId!, textContent);
        
      } catch (error: any) {
        this.logger.error(`Erro ao processar incoming message: ${error.message}`);
      }
    }
  }

  private isDuplicateMessage(messageId: string): boolean {
    const now = Date.now();
    const existing = this.processedMessageIds.get(messageId);
    if (existing && now - existing <= this.processedMessageTtlMs) {
      return true;
    }
    this.processedMessageIds.set(messageId, now);
    return false;
  }

  private cleanupProcessedMessages(): void {
    const now = Date.now();
    for (const [messageId, timestamp] of this.processedMessageIds.entries()) {
      if (now - timestamp > this.processedMessageTtlMs) {
        this.processedMessageIds.delete(messageId);
      }
    }
  }
}
