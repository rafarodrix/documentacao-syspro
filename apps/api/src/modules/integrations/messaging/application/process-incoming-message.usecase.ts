import { Injectable, Logger } from '@nestjs/common';
import { ChatwootClient } from '../../chatwoot/chatwoot.client';
import { PrismaService } from '../../../../prisma/prisma.service';
import { EvolutionClient } from '../../evolution/evolution.client';

@Injectable()
export class ProcessIncomingMessageUseCase {
  private readonly logger = new Logger(ProcessIncomingMessageUseCase.name);
  private readonly processedMessageIds = new Map<string, number>();
  private readonly processedMessageTtlMs = 10 * 60 * 1000;
  private dedupTableUnavailableLogged = false;

  constructor(
    private readonly chatwootClient: ChatwootClient,
    private readonly prisma: PrismaService,
    private readonly evolutionClient: EvolutionClient
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
      else textContent = '[Mensagem de midia recebida]';

      let attachment: any = undefined;
      let isMedia = false;
      let mimeType = '';
      let fileName = 'arquivo';

      if (messagePayload?.imageMessage) {
        isMedia = true;
        mimeType = messagePayload.imageMessage.mimetype || 'image/jpeg';
        fileName = 'imagem.jpg';
      } else if (messagePayload?.videoMessage) {
        isMedia = true;
        mimeType = messagePayload.videoMessage.mimetype || 'video/mp4';
        fileName = 'video.mp4';
      } else if (messagePayload?.documentMessage) {
        isMedia = true;
        mimeType = messagePayload.documentMessage.mimetype || 'application/pdf';
        fileName = messagePayload.documentMessage.fileName || 'documento.pdf';
      } else if (messagePayload?.audioMessage) {
        isMedia = true;
        mimeType = messagePayload.audioMessage.mimetype || 'audio/ogg';
        fileName = 'audio.ogg';
      }

      if (isMedia) {
        const baseResult = msg.base64 ? { base64: msg.base64 } : await this.evolutionClient.getBase64FromMediaMessage(msg);
        if (baseResult?.base64) {
          attachment = { base64: baseResult.base64, mimetype: mimeType, filename: fileName };
        }
      }

      this.logger.log(JSON.stringify({
        flow: 'evolution_to_chatwoot',
        stage: 'received',
        instanceId,
        messageId,
        whatsappNumber: phone,
      }));

      let contactIdentifier: string | undefined;
      let conversationId: string | undefined;

      try {
        const link = await this.resolveOrCreateConversationLink(phone, pushName);
        contactIdentifier = link.contactIdentifier;
        conversationId = link.conversationId;

        await this.chatwootClient.createIncomingMessage(contactIdentifier, conversationId, textContent, attachment);
        this.logger.log(JSON.stringify({
          flow: 'evolution_to_chatwoot',
          stage: 'forwarded',
          instanceId,
          messageId,
          chatwootConversationId: conversationId,
          whatsappNumber: phone,
        }));
      } catch (error: any) {
        if (error?.message?.includes('404')) {
          this.logger.warn(
            `[AUTO-CURA] Detectado erro 404 no Chatwoot para o numero ${phone} (contactIdentifier=${contactIdentifier ?? 'n/a'}, conversationId=${conversationId ?? 'n/a'}). Removendo vinculo quebrado no banco...`
          );

          try {
            await this.prisma.conversationLink.deleteMany({
              where: { whatsappNumber: phone }
            });
            this.logger.log(`[AUTO-CURA] Vinculo do numero ${phone} apagado. Recriando conversa e reenviando a mensagem atual.`);

            const recreatedLink = await this.resolveOrCreateConversationLink(phone, pushName);
            contactIdentifier = recreatedLink.contactIdentifier;
            conversationId = recreatedLink.conversationId;

            await this.chatwootClient.createIncomingMessage(contactIdentifier, conversationId, textContent, attachment);
            this.logger.log(JSON.stringify({
              flow: 'evolution_to_chatwoot',
              stage: 'forwarded_after_auto_heal',
              instanceId,
              messageId,
              chatwootConversationId: conversationId,
              whatsappNumber: phone,
            }));
            continue;
          } catch (retryErr: any) {
            this.logger.error(`[AUTO-CURA] Falha ao recriar/reenviar apos auto-cura: ${retryErr.message}`);
            error = retryErr;
          }
        }

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

  async handleStatusUpdate(payload: any) {
    const updates = Array.isArray(payload) ? payload : [payload];

    for (const item of updates) {
      const evolutionMsgId = item?.key?.id;
      const statusVal = item?.update?.status;

      if (!evolutionMsgId || statusVal === undefined) continue;

      let chatwootStatus: 'delivered' | 'read' | null = null;
      if (statusVal === 3 || String(statusVal).toUpperCase().includes('DELIVER')) chatwootStatus = 'delivered';
      else if (statusVal === 4 || String(statusVal).toUpperCase().includes('READ')) chatwootStatus = 'read';

      if (!chatwootStatus) continue;

      try {
        const link = await (this.prisma as any).messageLink.findUnique({
          where: { evolutionMessageId: evolutionMsgId }
        });

        if (link) {
          await this.chatwootClient.updateMessageStatus(link.chatwootConversationId, link.chatwootMessageId, chatwootStatus);
        }
      } catch (error: any) {
        this.logger.debug(`Nao foi possivel atualizar status de leitura: ${error.message}`);
      }
    }
  }

  private async resolveOrCreateConversationLink(phone: string, pushName: string): Promise<{ contactIdentifier: string; conversationId: string }> {
    let link = await this.prisma.conversationLink.findUnique({
      where: { whatsappNumber: phone }
    });

    let contactIdentifier = link?.chatwootContactId;
    let conversationId = link?.chatwootConversationId;

    if (!link) {
      let sysproContact = await this.prisma.companyContact.findFirst({
        where: { whatsapp: phone },
        include: { company: true },
      });

      if (!sysproContact) {
        sysproContact = await this.prisma.companyContact.create({
          data: {
            name: String(pushName),
            whatsapp: String(phone),
          },
          include: { company: true },
        });
      }

      if (!sysproContact) throw new Error('Falha ao processar o contato no banco de dados');

      const contactName = sysproContact.company
        ? `${sysproContact.name} - ${sysproContact.company.nomeFantasia || sysproContact.company.razaoSocial}`
        : sysproContact.name;

      const picResult = await this.evolutionClient.fetchProfilePicture(phone);
      const contactResponse = (await this.chatwootClient.createOrFindContact(phone, contactName, picResult?.profilePictureUrl)) as any;
      const contact = contactResponse?.payload?.contact;

      const configuredInboxIdentifier = process.env.CHATWOOT_INBOX_IDENTIFIER?.toString();
      const configuredInboxId = process.env.CHATWOOT_INBOX_ID?.toString();
      const sourceIdFromInbox =
        contact?.contact_inboxes
          ?.find((item: any) => {
            const inboxId = item?.inbox?.id?.toString?.() ?? item?.inbox_id?.toString?.();
            const inboxIdentifier = item?.inbox?.identifier?.toString?.() ?? item?.inbox_identifier?.toString?.();

            if (configuredInboxIdentifier && inboxIdentifier === configuredInboxIdentifier) return true;
            if (configuredInboxId && inboxId === configuredInboxId) return true;
            if (!configuredInboxId && configuredInboxIdentifier && inboxId === configuredInboxIdentifier) return true;
            return false;
          })
          ?.source_id
          ?.toString?.();

      contactIdentifier =
        contact?.source_id?.toString?.() ??
        sourceIdFromInbox ??
        contact?.contact_inboxes?.[0]?.source_id?.toString?.();

      if (!contactIdentifier) {
        throw new Error(`Nao foi possivel resolver source_id publico do contato no Chatwoot (contact_id=${contact?.id ?? 'n/a'})`);
      }

      const convResponse = (await this.chatwootClient.createConversation(contactIdentifier)) as any;
      conversationId =
        convResponse?.id?.toString?.() ??
        convResponse?.payload?.id?.toString?.() ??
        convResponse?.conversation?.id?.toString?.();
      if (!conversationId) {
        throw new Error(`Nao foi possivel resolver id da conversa criada no Chatwoot (contactIdentifier=${contactIdentifier})`);
      }

      try {
        link = await this.prisma.conversationLink.create({
          data: {
            whatsappNumber: phone,
            chatwootContactId: contactIdentifier,
            chatwootConversationId: conversationId!,
          },
        });
      } catch (error: any) {
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

    if (!contactIdentifier || !conversationId) {
      throw new Error(`Vinculo de conversa invalido para ${phone}`);
    }

    return { contactIdentifier, conversationId };
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
        error?.code === 'P2010' &&
        (error?.meta?.code === '42P01' ||
          String(error?.meta?.message || '').toLowerCase().includes('does not exist'));

      if (relationMissing) {
        if (!this.dedupTableUnavailableLogged) {
          this.logger.warn(
            'Tabela integration_webhook_dedup ausente. Deduplicacao em banco desabilitada ate aplicar migracoes.'
          );
          this.dedupTableUnavailableLogged = true;
        }
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
