import { Injectable, Logger } from '@nestjs/common';
import { ChatwootClient } from '../../chatwoot/chatwoot.client';
import { PrismaService } from '../../../../prisma/prisma.service';
import { EvolutionClient } from '../../evolution/evolution.client';
import { IntegrationWebhookDedupService } from './integration-webhook-dedup.service';
import { IntegrationContextService, type ResolvedIntegrationContext } from '../../../settings/integration-context.service';

@Injectable()
export class ProcessIncomingMessageUseCase {
  private readonly logger = new Logger(ProcessIncomingMessageUseCase.name);
  private readonly conversationLinkLocks = new Map<string, Promise<void>>();

  constructor(
    private readonly chatwootClient: ChatwootClient,
    private readonly prisma: PrismaService,
    private readonly evolutionClient: EvolutionClient,
    private readonly dedupService: IntegrationWebhookDedupService,
    private readonly integrationContext: IntegrationContextService,
  ) {}

  async execute(payload: any, context?: { instanceId?: string; connection?: ResolvedIntegrationContext }) {
    const messages = Array.isArray(payload) ? payload : (payload?.messages || [payload?.message || payload]);
    const instanceId = context?.instanceId ?? null;
    const resolvedConnection =
      context?.connection ??
      await this.integrationContext.getDefaultContext();

    if (!resolvedConnection) {
      this.logger.error('Nenhuma conexao ativa encontrada para processar mensagem inbound da Evolution.');
      return;
    }

    for (const msg of messages) {
      if (!msg) continue;

      const fromMe = Boolean(msg?.key?.fromMe ?? msg?.Info?.IsFromMe ?? msg?.info?.IsFromMe);
      const messageId = (msg?.key?.id ?? msg?.Info?.ID ?? msg?.info?.ID)?.toString();
      if (fromMe) {
        this.logger.debug(JSON.stringify({
          flow: 'evolution_to_chatwoot',
          stage: 'skipped_from_me',
          instanceId,
          messageId: messageId ?? null,
        }));
        continue;
      }

      if (messageId) {
        const existingLink = await this.prisma.messageLink.findUnique({
          where: {
            connectionKey_evolutionMessageId: {
              connectionKey: resolvedConnection.connectionKey,
              evolutionMessageId: messageId,
            },
          },
        });
        if (existingLink) {
          this.logger.debug(JSON.stringify({
            flow: 'evolution_to_chatwoot',
            stage: 'skipped_echo',
            instanceId,
            messageId,
            chatwootConversationId: existingLink.chatwootConversationId,
          }));
          continue;
        }
      }

      if (messageId) {
        const providerEventId = `message:${messageId}`;
        const dedupeClaimed = await this.dedupService.claim('evolution_inbound', providerEventId, instanceId);
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
        const inlineBase64 =
          messagePayload?.base64 ??
          msg?.base64;
        const baseResult = inlineBase64
          ? { base64: inlineBase64 }
          : null;
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
        const link = await this.resolveOrCreateConversationLink(phone, pushName, resolvedConnection);
        contactIdentifier = link.contactIdentifier;
        conversationId = link.conversationId;

        await this.chatwootClient.createIncomingMessage(
          resolvedConnection.chatwoot,
          contactIdentifier,
          conversationId,
          textContent,
          attachment
        );
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
              where: {
                whatsappNumber: phone,
                connectionKey: resolvedConnection.connectionKey,
                ...(conversationId ? { chatwootConversationId: conversationId } : {}),
              }
            });
            this.logger.log(`[AUTO-CURA] Vinculo do numero ${phone} apagado. Recriando conversa e reenviando a mensagem atual.`);

            const recreatedLink = await this.resolveOrCreateConversationLink(phone, pushName, resolvedConnection);
            contactIdentifier = recreatedLink.contactIdentifier;
            conversationId = recreatedLink.conversationId;

            await this.chatwootClient.createIncomingMessage(
              resolvedConnection.chatwoot,
              contactIdentifier,
              conversationId,
              textContent,
              attachment
            );
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

  async handleStatusUpdate(payload: any, context?: { instanceId?: string; connection?: ResolvedIntegrationContext }) {
    const receiptPayload = this.normalizeReceiptPayload(payload);
    if (receiptPayload) {
      await this.handleReceiptStatusUpdate(receiptPayload, context);
      return;
    }

    const updates = Array.isArray(payload) ? payload : [payload];
    for (const item of updates) {
      const evolutionMsgId = item?.key?.id;
      const statusVal = item?.update?.status;
      const chatwootStatus = this.mapLegacyStatusToChatwoot(statusVal);

      if (!evolutionMsgId || !chatwootStatus) continue;
      await this.syncStatusToChatwoot(evolutionMsgId.toString(), chatwootStatus, context?.instanceId, context?.connection);
    }
  }

  private async handleReceiptStatusUpdate(
    payload: { messageIds: string[]; chatwootStatus: 'delivered' | 'read' },
    context?: { instanceId?: string; connection?: ResolvedIntegrationContext }
  ) {
    for (const evolutionMsgId of payload.messageIds) {
      await this.syncStatusToChatwoot(evolutionMsgId, payload.chatwootStatus, context?.instanceId, context?.connection);
    }
  }

  private async syncStatusToChatwoot(
    evolutionMsgId: string,
    chatwootStatus: 'delivered' | 'read',
    instanceId?: string | null,
    connection?: ResolvedIntegrationContext
  ) {
    const dedupeClaimed = await this.dedupService.claim(
      'evolution_status',
      `status:${evolutionMsgId}:${chatwootStatus}`,
      instanceId ?? null
    );
    if (!dedupeClaimed) return;

    try {
      const resolvedConnection =
        connection ??
        await this.integrationContext.getDefaultContext();
      if (!resolvedConnection) return;

      const link = await this.prisma.messageLink.findUnique({
        where: {
          connectionKey_evolutionMessageId: {
            connectionKey: resolvedConnection.connectionKey,
            evolutionMessageId: evolutionMsgId,
          },
        }
      });

      if (link) {
        await this.chatwootClient.updateMessageStatus(
          resolvedConnection.chatwoot,
          link.chatwootConversationId,
          link.chatwootMessageId,
          chatwootStatus
        );
      }
    } catch (error: any) {
      this.logger.debug(`Nao foi possivel atualizar status de leitura: ${error.message}`);
    }
  }

  private normalizeReceiptPayload(payload: any): { messageIds: string[]; chatwootStatus: 'delivered' | 'read' } | null {
    const state = String(payload?.state ?? '').trim();
    const chatwootStatus = this.mapReceiptStateToChatwoot(state);
    if (!chatwootStatus) return null;

    const messageIds = Array.isArray(payload?.data?.MessageIDs)
      ? payload.data.MessageIDs
          .map((value: unknown) => String(value ?? '').trim())
          .filter((value: string) => value.length > 0)
      : [];

    if (!messageIds.length) return null;
    return { messageIds, chatwootStatus };
  }

  private mapLegacyStatusToChatwoot(status: unknown): 'delivered' | 'read' | null {
    const normalized = String(status ?? '').trim().toUpperCase();
    if (!normalized) return null;

    if (normalized === 'DELIVERED' || normalized === 'SERVER_ACK' || normalized === '2') {
      return 'delivered';
    }

    if (normalized === 'READ' || normalized === 'READSELF' || normalized === 'PLAYED' || normalized === '4') {
      return 'read';
    }

    return null;
  }

  private mapReceiptStateToChatwoot(state: string): 'delivered' | 'read' | null {
    const normalized = state.toUpperCase();
    if (normalized === 'DELIVERED') return 'delivered';
    if (normalized === 'READ' || normalized === 'READSELF') return 'read';
    return null;
  }

  private async withConversationLinkLock<T>(lockKey: string, work: () => Promise<T>): Promise<T> {
    const previous = this.conversationLinkLocks.get(lockKey);
    if (previous) {
      await previous;
    }

    let release!: () => void;
    const current = new Promise<void>((resolve) => {
      release = resolve;
    });
    this.conversationLinkLocks.set(lockKey, current);

    try {
      return await work();
    } finally {
      release();
      if (this.conversationLinkLocks.get(lockKey) === current) {
        this.conversationLinkLocks.delete(lockKey);
      }
    }
  }

  private async resolveOrCreateConversationLink(
    phone: string,
    pushName: string,
    connection: ResolvedIntegrationContext
  ): Promise<{ contactIdentifier: string; conversationId: string }> {
    const lockKey = `${connection.connectionKey}:${phone}`;

    return this.withConversationLinkLock(lockKey, async () => {
      let link = await this.prisma.conversationLink.findUnique({
        where: {
          connectionKey_whatsappNumber: {
            connectionKey: connection.connectionKey,
            whatsappNumber: phone,
          },
        }
      });
      const linkExisted = Boolean(link);

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
              source: 'WHATSAPP',
              status: 'PENDING_LINK',
            },
            include: { company: true },
          });
        }

        if (!sysproContact) throw new Error('Falha ao processar o contato no banco de dados');

        const contactName = sysproContact.company
          ? `${sysproContact.name} - ${sysproContact.company.nomeFantasia || sysproContact.company.razaoSocial}`
          : sysproContact.name;

        const picResult = await this.evolutionClient.fetchProfilePicture(connection.evolution, phone);
        const contactResponse = (await this.chatwootClient.createOrFindContact(
          connection.chatwoot,
          phone,
          contactName,
          picResult?.profilePictureUrl
        )) as any;
        const contact = contactResponse?.payload?.contact;

        const configuredInboxIdentifier = connection.chatwoot.inboxIdentifier?.toString();
        const configuredInboxId = connection.chatwoot.inboxId?.toString();
        const matchesConfiguredInbox = (item: any) => {
          const inboxId = item?.inbox?.id?.toString?.() ?? item?.inbox_id?.toString?.();
          const inboxIdentifier = item?.inbox?.identifier?.toString?.() ?? item?.inbox_identifier?.toString?.();

          if (configuredInboxIdentifier && inboxIdentifier === configuredInboxIdentifier) return true;
          if (configuredInboxId && inboxId === configuredInboxId) return true;
          if (!configuredInboxId && configuredInboxIdentifier && inboxId === configuredInboxIdentifier) return true;
          return false;
        };

        const sourceIdFromEmbeddedInbox =
          contact?.contact_inboxes
            ?.find((item: any) => matchesConfiguredInbox(item))
            ?.source_id
            ?.toString?.();

        const contactableInboxes =
          contact?.id
            ? await this.chatwootClient.getContactableInboxes(connection.chatwoot, contact.id.toString())
            : [];

        const sourceIdFromContactableInbox =
          contactableInboxes
            ?.find((item: any) => matchesConfiguredInbox(item))
            ?.source_id
            ?.toString?.();

        contactIdentifier =
          sourceIdFromEmbeddedInbox ??
          sourceIdFromContactableInbox;

        if (!contactIdentifier && !configuredInboxIdentifier && !configuredInboxId) {
          contactIdentifier =
            contact?.source_id?.toString?.() ??
            contact?.contact_inboxes?.[0]?.source_id?.toString?.() ??
            contactableInboxes?.[0]?.source_id?.toString?.();
        }

        this.logger.log(JSON.stringify({
          flow: 'evolution_to_chatwoot',
          stage: 'contact_resolved',
          whatsappNumber: phone,
          connectionKey: connection.connectionKey,
          chatwootContactId: contact?.id?.toString?.() ?? null,
          sourceId: contactIdentifier ?? null,
          inboxIdentifier: connection.chatwoot.inboxIdentifier ?? null,
          inboxId: connection.chatwoot.inboxId ?? null,
          contactInboxes: Array.isArray(contact?.contact_inboxes)
            ? contact.contact_inboxes.map((item: any) => ({
                inboxId: item?.inbox?.id?.toString?.() ?? item?.inbox_id?.toString?.() ?? null,
                inboxIdentifier:
                  item?.inbox?.identifier?.toString?.() ?? item?.inbox_identifier?.toString?.() ?? null,
                sourceId: item?.source_id?.toString?.() ?? null,
              }))
            : [],
          contactableInboxes: Array.isArray(contactableInboxes)
            ? contactableInboxes.map((item: any) => ({
                inboxId: item?.inbox?.id?.toString?.() ?? null,
                inboxIdentifier: item?.inbox?.identifier?.toString?.() ?? null,
                sourceId: item?.source_id?.toString?.() ?? null,
              }))
            : [],
        }));

        if (!contactIdentifier) {
          throw new Error(
            `Nao foi possivel resolver source_id publico do contato no Chatwoot para a inbox configurada (contact_id=${contact?.id ?? 'n/a'}, inboxId=${configuredInboxId ?? 'n/a'}, inboxIdentifier=${configuredInboxIdentifier ?? 'n/a'})`
          );
        }

        const convResponse = (await this.chatwootClient.createConversation(
          connection.chatwoot,
          contactIdentifier,
          contact?.id?.toString?.()
        )) as any;
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
              companyId: sysproContact.companyId ?? connection.companyId ?? null,
              connectionId: connection.connectionId,
              connectionKey: connection.connectionKey,
              whatsappNumber: phone,
              chatwootContactId: contactIdentifier,
              chatwootConversationId: conversationId!,
            },
          });
        } catch (error: any) {
          if (error?.code === 'P2002') {
            link =
              await this.prisma.conversationLink.findFirst({
                where: {
                  connectionKey: connection.connectionKey,
                  whatsappNumber: phone,
                },
              }) ??
              await this.prisma.conversationLink.findFirst({
                where: { whatsappNumber: phone },
                orderBy: { createdAt: 'desc' },
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

      this.logger.log(JSON.stringify({
        flow: 'evolution_to_chatwoot',
        stage: 'link_resolved',
        whatsappNumber: phone,
        contactIdentifier,
        conversationId,
        isNew: !linkExisted,
        connectionKey: connection.connectionKey,
      }));

      return { contactIdentifier, conversationId };
    });
  }
}
