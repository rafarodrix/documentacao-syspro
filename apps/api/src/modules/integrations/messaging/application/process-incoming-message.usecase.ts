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
      else textContent = '[Mensagem de mídia recebida]';

      let attachment: any = undefined;
      let isMedia = false;
      let mimeType = '';
      let fileName = 'arquivo';

      if (messagePayload?.imageMessage) { isMedia = true; mimeType = messagePayload.imageMessage.mimetype || 'image/jpeg'; fileName = 'imagem.jpg'; }
      else if (messagePayload?.videoMessage) { isMedia = true; mimeType = messagePayload.videoMessage.mimetype || 'video/mp4'; fileName = 'video.mp4'; }
      else if (messagePayload?.documentMessage) { isMedia = true; mimeType = messagePayload.documentMessage.mimetype || 'application/pdf'; fileName = messagePayload.documentMessage.fileName || 'documento.pdf'; }
      else if (messagePayload?.audioMessage) { isMedia = true; mimeType = messagePayload.audioMessage.mimetype || 'audio/ogg'; fileName = 'audio.ogg'; }

      if (isMedia) {
         // Puxa o arquivo na Evolution em base64
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

          // Captura Avatar do WhatsApp
          const picResult = await this.evolutionClient.fetchProfilePicture(phone);

          const contactResponse = (await this.chatwootClient.createOrFindContact(phone, contactName, picResult?.profilePictureUrl)) as any;
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
        await this.chatwootClient.createIncomingMessage(contactIdentifier!, conversationId!, textContent, attachment);
        this.logger.log(JSON.stringify({
          flow: 'evolution_to_chatwoot',
          stage: 'forwarded',
          instanceId,
          messageId,
          chatwootConversationId: conversationId,
          whatsappNumber: phone,
        }));
        
      } catch (error: any) {
        // Sistema de auto-cura: Se o Chatwoot retornar 404, possivelmente o contato/conversa foi apagado no painel.
        if (error?.message?.includes('404')) {
          this.logger.warn(`[AUTO-CURA] Detectado erro 404 no Chatwoot para o número ${phone}. Removendo vínculo quebrado no banco...`);
          try {
            await this.prisma.conversationLink.deleteMany({
              where: { whatsappNumber: phone }
            });
            this.logger.log(`[AUTO-CURA] Vínculo do número ${phone} apagado. A próxima mensagem recriará o chat.`);
          } catch (dbErr: any) {
            this.logger.error(`[AUTO-CURA] Falha ao tentar apagar vínculo: ${dbErr.message}`);
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
      // Status da biblioteca Bailey (Evolution): 3 = entregue, 4 = lido
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
