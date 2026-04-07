import { Injectable, Logger } from '@nestjs/common';
import { ChatwootClient } from '../../chatwoot/chatwoot.client';
import { PrismaService } from '../../../../prisma/prisma.service';

@Injectable()
export class ProcessIncomingMessageUseCase {
  private readonly logger = new Logger(ProcessIncomingMessageUseCase.name);
  private readonly processedMessageIds = new Map<string, number>();
  private readonly processedMessageTtlMs = 10 * 60 * 1000;
  private dedupTableUnavailableLogged = false;

  constructor(
    private readonly chatwootClient: ChatwootClient,
    private readonly prisma: PrismaService
  ) {}

  async execute(payload: any, context?: { instanceId?: string }) {
    const messages = Array.isArray(payload) ? payload : (payload?.messages || [payload?.message || payload]);
    this.cleanupProcessedMessages();
    const instanceId = context?.instanceId ?? null;

    for (const msg of messages) {
      if (!msg) continue;

      const fromMe = Boolean(msg?.key?.fromMe ?? msg?.Info?.IsFromMe ?? msg?.info?.IsFromMe);
      if (fromMe) continue;

      const messageId = (msg?.key?.id ?? msg?.Info?.ID ?? msg?.info?.ID)?.toString();
      if (messageId && this.isDuplicateMessage(messageId)) {
        this.logger.debug(`Mensagem duplicada ignorada: ${messageId}`);
        continue;
      }

      if (messageId) {
        const dedupeClaimed = await this.claimDedupEvent('evolution_inbound', messageId, instanceId);
        if (!dedupeClaimed) {
          this.logger.debug(JSON.stringify({
            flow: 'evolution_to_chatwoot',
            dedup: 'db_hit',
            instanceId,
            messageId,
          }));
          continue;
        }
      }

      const remoteJid = msg?.key?.remoteJid ?? msg?.Info?.Chat ?? msg?.info?.Chat;
      if (!remoteJid) continue;
      if (!remoteJid.endsWith('@s.whatsapp.net')) {
        this.logger.debug(`JID nao suportado ignorado: ${remoteJid}`);
        continue;
      }

      const phone = remoteJid.replace('@s.whatsapp.net', '');
      const pushName = msg?.pushName ?? msg?.Info?.PushName ?? msg?.info?.PushName ?? 'Cliente WhatsApp';
      const messagePayload = msg?.message ?? msg?.Message;
      
      let textContent = '';
      if (messagePayload?.conversation) textContent = messagePayload.conversation;
      else if (messagePayload?.extendedTextMessage?.text) textContent = messagePayload.extendedTextMessage.text;
      else if (messagePayload?.imageMessage?.caption) textContent = messagePayload.imageMessage.caption;
      else if (messagePayload?.videoMessage?.caption) textContent = messagePayload.videoMessage.caption;
      else if (messagePayload?.documentMessage?.caption) textContent = messagePayload.documentMessage.caption;
      else textContent = '[Mensagem de mídia recebida]';

      this.logger.log(JSON.stringify({
        flow: 'evolution_to_chatwoot',
        stage: 'received',
        instanceId,
        messageId,
        whatsappNumber: phone,
      }));

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
          const contact = contactResponse?.payload?.contact;
          
          contactIdentifier = contact?.source_id?.toString() ?? contact?.contact_inboxes?.[0]?.source_id?.toString() ?? contact?.id?.toString();

          if (!contactIdentifier) throw new Error('Não foi possível resolver o identificador do contato no Chatwoot');

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
        this.logger.log(JSON.stringify({
          flow: 'evolution_to_chatwoot',
          stage: 'forwarded',
          instanceId,
          messageId,
          chatwootConversationId: conversationId,
          whatsappNumber: phone,
        }));
        
      } catch (error: any) {
        this.logger.error(JSON.stringify({
          flow: 'evolution_to_chatwoot',
          stage: 'failed',
          instanceId,
          messageId,
          whatsappNumber: phone,
          error: error?.message ?? 'unknown_error',
        }));
      }
    }
  }

  private async claimDedupEvent(provider: string, eventKey: string, instanceId: string | null): Promise<boolean> {
    try {
      const rows = await this.prisma.$executeRawUnsafe(
        `
        INSERT INTO "integration_webhook_dedup" ("id", "provider", "eventKey", "instanceId", "createdAt")
        VALUES ($1 || ':' || $2, $1, $2, $3, NOW())
        ON CONFLICT ("provider", "eventKey") DO NOTHING
        `,
        provider,
        eventKey,
        instanceId
      );
      return Number(rows) > 0;
    } catch (error: any) {
      const relationMissing =
        error?.code === "P2010" &&
        (error?.meta?.code === "42P01" ||
          String(error?.meta?.message || "").toLowerCase().includes("does not exist"));

      if (relationMissing) {
        if (!this.dedupTableUnavailableLogged) {
          this.logger.warn(
            "Tabela integration_webhook_dedup ausente. Deduplicacao em banco desabilitada ate aplicar migracoes."
          );
          this.dedupTableUnavailableLogged = true;
        }
        // Nao bloqueia o fluxo de webhook enquanto a migracao nao foi aplicada.
        return true;
      }

      throw error;
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
