import { Injectable, Logger } from '@nestjs/common';
import { CompanyContactStatus } from '@prisma/client';
import { ChatwootClient } from '../../chatwoot/chatwoot.client';
import { PrismaService } from '../../../../prisma/prisma.service';
import { EvolutionClient } from '../../evolution/evolution.client';
import { R2StorageService } from '../../storage/r2-storage.service';
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
    private readonly r2Storage: R2StorageService,
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

    const failures: string[] = [];

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
      const isGroupChat = String(remoteJid).endsWith('@g.us');
      if (isGroupChat && !this.isAllowedGroupJid(String(remoteJid), resolvedConnection)) {
        this.logger.debug(JSON.stringify({
          flow: 'evolution_to_chatwoot',
          stage: 'group_message_ignored_not_allowed',
          instanceId,
          messageId: messageId ?? null,
          groupJid: String(remoteJid),
          connectionKey: resolvedConnection.connectionKey,
        }));
        continue;
      }

      if (!String(remoteJid).endsWith('@s.whatsapp.net') && !isGroupChat) {
        this.logger.debug(`JID nao suportado ignorado: ${remoteJid}`);
        continue;
      }

      const phone = isGroupChat ? String(remoteJid) : String(remoteJid).replace('@s.whatsapp.net', '');
      const pushName = msg?.pushName ?? msg?.Info?.PushName ?? msg?.info?.PushName ?? 'Cliente WhatsApp';
      const groupParticipantJid = isGroupChat
        ? this.readFirstString(msg?.key?.participant, msg?.Info?.Sender, msg?.info?.Sender, msg?.participant)
        : undefined;
      const messagePayload = msg?.message ?? msg?.Message;

      let textContent = '';
      if (messagePayload?.conversation) textContent = messagePayload.conversation;
      else if (messagePayload?.extendedTextMessage?.text) textContent = messagePayload.extendedTextMessage.text;
      else if (messagePayload?.imageMessage?.caption) textContent = messagePayload.imageMessage.caption;
      else if (messagePayload?.videoMessage?.caption) textContent = messagePayload.videoMessage.caption;
      else if (messagePayload?.documentMessage?.caption) textContent = messagePayload.documentMessage.caption;
      else textContent = '';

      if (isGroupChat) {
        textContent = this.prefixGroupMessage(textContent, {
          pushName,
          participantJid: groupParticipantJid,
        });
      }

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
        const mediaPayload = await this.resolveIncomingAttachmentPayload(
          messagePayload,
          msg,
          mimeType,
          fileName,
        );
        if (mediaPayload?.base64) {
          attachment = await this.attachPublicMediaUrl(mediaPayload, {
            instanceId,
            messageId,
            whatsappNumber: phone,
          });
        } else {
          this.logger.warn(JSON.stringify({
            flow: 'evolution_to_chatwoot',
            stage: 'media_payload_missing_binary',
            instanceId,
            messageId: messageId ?? null,
            whatsappNumber: phone,
            mimetype: mimeType || null,
            filename: fileName,
          }));
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
        const link = isGroupChat
          ? await this.resolveOrCreateGroupConversationLink(String(remoteJid), resolvedConnection)
          : await this.resolveOrCreateConversationLink(phone, pushName, resolvedConnection);
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

        if (messageId) {
          await this.dedupService.release('evolution_inbound', `message:${messageId}`);
        }

        this.logger.error(JSON.stringify({
          flow: 'evolution_to_chatwoot',
          stage: 'failed',
          instanceId,
          messageId,
          whatsappNumber: phone,
          error: error?.message ?? 'unknown_error',
        }));
        failures.push(`messageId=${messageId ?? 'unknown'} phone=${phone} error=${error?.message ?? 'unknown_error'}`);
      }
    }

    if (failures.length > 0) {
      throw new Error(`Falha ao encaminhar ${failures.length} mensagem(ns) da Evolution para o Chatwoot: ${failures.join(' | ')}`);
    }
  }

  private async resolveIncomingAttachmentPayload(
    messagePayload: any,
    rawMessage: any,
    mimeType: string,
    fileName: string,
  ): Promise<{ base64: string; mimetype: string; filename: string } | undefined> {
    const directBase64Candidates = [
      messagePayload?.base64,
      rawMessage?.base64,
      messagePayload?.imageMessage?.base64,
      messagePayload?.videoMessage?.base64,
      messagePayload?.documentMessage?.base64,
      messagePayload?.audioMessage?.base64,
    ];

    for (const candidate of directBase64Candidates) {
      const normalized = String(candidate ?? '').trim();
      if (!normalized) continue;

      if (normalized.startsWith('data:')) {
        const [, encoded = ''] = normalized.split(',', 2);
        if (encoded) {
          return { base64: encoded, mimetype: mimeType, filename: fileName };
        }
      }

      return { base64: normalized, mimetype: mimeType, filename: fileName };
    }

    const urlCandidates = [
      messagePayload?.imageMessage?.url,
      messagePayload?.videoMessage?.url,
      messagePayload?.documentMessage?.url,
      messagePayload?.audioMessage?.url,
      messagePayload?.url,
      rawMessage?.url,
    ]
      .map((value: unknown) => String(value ?? '').trim())
      .filter((value: string) => /^https?:\/\//i.test(value) || /^data:/i.test(value));

    for (const candidate of urlCandidates) {
      try {
        if (candidate.startsWith('data:')) {
          const [, encoded = ''] = candidate.split(',', 2);
          if (encoded) {
            return { base64: encoded, mimetype: mimeType, filename: fileName };
          }
          continue;
        }

        const response = await fetch(candidate);
        if (!response.ok) continue;

        const buffer = Buffer.from(await response.arrayBuffer());
        if (!buffer.length) continue;

        return {
          base64: buffer.toString('base64'),
          mimetype: mimeType || response.headers.get('content-type') || 'application/octet-stream',
          filename: fileName,
        };
      } catch {
        continue;
      }
    }

    return undefined;
  }

  private async attachPublicMediaUrl(
    attachment: { base64: string; mimetype: string; filename: string },
    context: { instanceId?: string | null; messageId?: string; whatsappNumber: string },
  ): Promise<{ base64: string; mimetype: string; filename: string; publicUrl?: string }> {
    if (!this.r2Storage.isEnabled()) {
      return attachment;
    }

    try {
      const buffer = Buffer.from(attachment.base64, 'base64');
      const uploaded = await this.r2Storage.uploadBuffer({
        buffer,
        filename: attachment.filename,
        contentType: attachment.mimetype,
        prefix: 'evolution-media',
      });

      this.logger.log(JSON.stringify({
        flow: 'evolution_to_chatwoot',
        stage: 'incoming_attachment_uploaded_r2',
        instanceId: context.instanceId ?? null,
        messageId: context.messageId ?? null,
        whatsappNumber: context.whatsappNumber,
        storageKey: uploaded.key,
        storageUrlHost: this.extractUrlHost(uploaded.url),
      }));

      return {
        ...attachment,
        publicUrl: uploaded.url,
      };
    } catch (error: any) {
      this.logger.warn(JSON.stringify({
        flow: 'evolution_to_chatwoot',
        stage: 'incoming_attachment_r2_upload_failed',
        instanceId: context.instanceId ?? null,
        messageId: context.messageId ?? null,
        whatsappNumber: context.whatsappNumber,
        filename: attachment.filename,
        mimetype: attachment.mimetype,
        error: error?.message ?? 'unknown_error',
      }));
      return attachment;
    }
  }

  private extractUrlHost(value: string): string | null {
    try {
      return new URL(value).host;
    } catch {
      return null;
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

  async handleCallEvent(
    payload: any,
    context?: { event?: string; instanceId?: string; connection?: ResolvedIntegrationContext }
  ) {
    const calls = this.normalizeCallPayload(payload);
    if (!calls.length) {
      this.logger.debug(JSON.stringify({
        flow: 'evolution_to_chatwoot',
        stage: 'call_event_ignored_no_payload',
        event: context?.event ?? null,
        instanceId: context?.instanceId ?? null,
      }));
      return;
    }

    const resolvedConnection =
      context?.connection ??
      await this.integrationContext.getDefaultContext();

    if (!resolvedConnection) {
      this.logger.error('Nenhuma conexao ativa encontrada para processar ligacao inbound da Evolution.');
      return;
    }

    for (const call of calls) {
      const callInfo = this.extractCallInfo(call, context?.event);
      if (callInfo.isRelayLatency) {
        this.logger.debug(JSON.stringify({
          flow: 'evolution_to_chatwoot',
          stage: 'call_event_ignored_relay_latency',
          event: context?.event ?? null,
          instanceId: context?.instanceId ?? null,
          callId: callInfo.callId ?? null,
        }));
        continue;
      }

      if (callInfo.isGroup) {
        this.logger.debug(JSON.stringify({
          flow: 'evolution_to_chatwoot',
          stage: 'call_event_ignored_group',
          event: context?.event ?? null,
          instanceId: context?.instanceId ?? null,
          callId: callInfo.callId ?? null,
        }));
        continue;
      }

      if (!callInfo.phone) {
        this.logger.debug(JSON.stringify({
          flow: 'evolution_to_chatwoot',
          stage: 'call_event_ignored_no_phone',
          event: context?.event ?? null,
          instanceId: context?.instanceId ?? null,
          callId: callInfo.callId ?? null,
          remoteJid: callInfo.remoteJid ?? null,
        }));
        continue;
      }

      if (callInfo.fromMe) {
        this.logger.debug(JSON.stringify({
          flow: 'evolution_to_chatwoot',
          stage: 'call_event_ignored_from_me',
          event: context?.event ?? null,
          instanceId: context?.instanceId ?? null,
          callId: callInfo.callId ?? null,
          whatsappNumber: callInfo.phone,
        }));
        continue;
      }

      const dedupId = callInfo.callId
        ? `call:${callInfo.callId}`
        : `call:${callInfo.phone}:${callInfo.status ?? context?.event ?? 'unknown'}`;
      const dedupeClaimed = await this.dedupService.claim('evolution_call', dedupId, context?.instanceId ?? null);
      if (!dedupeClaimed) {
        this.logger.debug(JSON.stringify({
          flow: 'evolution_to_chatwoot',
          dedup: 'db_hit',
          stage: 'call_event_skipped_duplicate',
          instanceId: context?.instanceId ?? null,
          callId: callInfo.callId ?? null,
          whatsappNumber: callInfo.phone,
        }));
        continue;
      }

      try {
        const link = await this.resolveOrCreateConversationLink(
          callInfo.phone,
          callInfo.pushName ?? 'Cliente WhatsApp',
          resolvedConnection,
        );
        const content = this.buildCallLogMessage(callInfo);

        await this.chatwootClient.createIncomingMessage(
          resolvedConnection.chatwoot,
          link.contactIdentifier,
          link.conversationId,
          content,
        );

        this.logger.log(JSON.stringify({
          flow: 'evolution_to_chatwoot',
          stage: 'call_forwarded',
          event: context?.event ?? null,
          instanceId: context?.instanceId ?? null,
          callId: callInfo.callId ?? null,
          callStatus: callInfo.status ?? null,
          callType: callInfo.callType,
          chatwootConversationId: link.conversationId,
          whatsappNumber: callInfo.phone,
          remoteJid: callInfo.remoteJid ?? null,
          contactIdentifier: link.contactIdentifier,
        }));
      } catch (error: any) {
        await this.dedupService.release('evolution_call', dedupId);
        this.logger.error(JSON.stringify({
          flow: 'evolution_to_chatwoot',
          stage: 'call_forward_failed',
          event: context?.event ?? null,
          instanceId: context?.instanceId ?? null,
          callId: callInfo.callId ?? null,
          whatsappNumber: callInfo.phone,
          error: error?.message ?? 'unknown_error',
        }));
      }
    }
  }

  private normalizeCallPayload(payload: any): any[] {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.calls)) return payload.calls;
    if (Array.isArray(payload?.call)) return payload.call;
    if (Array.isArray(payload?.data)) return payload.data;
    if (payload?.call && typeof payload.call === 'object') return [payload.call];
    return payload ? [payload] : [];
  }

  private extractCallInfo(payload: any, event?: string): {
    callId?: string;
    phone: string | null;
    pushName?: string;
    status?: string;
    callType: 'audio' | 'video';
    fromMe: boolean;
    isGroup: boolean;
    isRelayLatency: boolean;
    remoteJid?: string;
  } {
    const normalizedEvent = String(event ?? '').trim().toLowerCase();
    const remoteJidCandidates = [
      payload?.key?.remoteJid,
      payload?.data?.key?.remoteJid,
      payload?.call?.key?.remoteJid,
      payload?.Info?.Chat,
      payload?.info?.Chat,
      payload?.data?.Info?.Chat,
      payload?.data?.info?.Chat,
      payload?.remoteJid,
      payload?.RemoteJid,
      payload?.data?.remoteJid,
      payload?.data?.RemoteJid,
      payload?.chatId,
      payload?.Chat,
      payload?.call?.chatId,
      payload?.call?.Chat,
      payload?.data?.chatId,
      payload?.data?.Chat,
      payload?.from,
      payload?.From,
      payload?.callCreator,
      payload?.CallCreator,
      payload?.sender,
      payload?.Sender,
      payload?.jid,
      payload?.JID,
      payload?.Info?.Sender,
      payload?.Info?.CallCreator,
      payload?.info?.Sender,
      payload?.info?.CallCreator,
      payload?.call?.from,
      payload?.call?.From,
      payload?.call?.callCreator,
      payload?.call?.CallCreator,
      payload?.call?.chatId,
      payload?.call?.Chat,
      payload?.data?.from,
      payload?.data?.From,
      payload?.data?.callCreator,
      payload?.data?.CallCreator,
      payload?.data?.Sender,
      payload?.data?.JID,
    ];
    const remoteJid =
      this.readFirstSupportedPhoneSource(...remoteJidCandidates) ??
      this.readFirstString(...remoteJidCandidates);
    const phone = this.extractPhoneFromJidOrNumber(remoteJid);
    const status = this.readFirstString(
      payload?.status,
      payload?.Status,
      payload?.state,
      payload?.State,
      payload?.type,
      payload?.Type,
      payload?.callStatus,
      payload?.CallStatus,
      payload?.reason,
      payload?.Reason,
      payload?.accept,
      payload?.Accept,
      payload?.call?.status,
      payload?.call?.Status,
      payload?.call?.reason,
      payload?.call?.Reason,
      payload?.data?.status,
      payload?.data?.Status,
      payload?.data?.reason,
      payload?.data?.Reason,
      payload?.data?.accept,
      payload?.data?.Accept,
      event,
    );
    const isVideo = Boolean(
      payload?.isVideo ??
      payload?.IsVideo ??
      payload?.is_video ??
      payload?.video ??
      payload?.call?.isVideo ??
      payload?.call?.IsVideo ??
      payload?.data?.isVideo ??
      payload?.data?.IsVideo
    );

    return {
      callId: this.readFirstString(
        payload?.id,
        payload?.ID,
        payload?.callId,
        payload?.CallID,
        payload?.CallId,
        payload?.call_id,
        payload?.call?.id,
        payload?.call?.ID,
        payload?.call?.CallID,
        payload?.call?.CallId,
        payload?.data?.id,
        payload?.data?.ID,
        payload?.data?.callId,
        payload?.data?.CallID,
        payload?.data?.CallId,
      ),
      phone,
      remoteJid,
      pushName: this.readFirstString(
        payload?.pushName,
        payload?.PushName,
        payload?.name,
        payload?.Name,
        payload?.callerName,
        payload?.CallerName,
        payload?.call?.pushName,
        payload?.call?.PushName,
        payload?.call?.Name,
        payload?.data?.pushName,
        payload?.data?.PushName,
        payload?.data?.Name,
      ),
      status,
      callType: isVideo ? 'video' : 'audio',
      fromMe: Boolean(
        payload?.fromMe ??
        payload?.IsFromMe ??
        payload?.isFromMe ??
        payload?.key?.fromMe ??
        payload?.data?.key?.fromMe ??
        payload?.call?.key?.fromMe ??
        payload?.call?.fromMe ??
        payload?.call?.IsFromMe ??
        payload?.data?.fromMe ??
        payload?.data?.IsFromMe
      ),
      isGroup: Boolean(
        payload?.isGroup ??
        payload?.IsGroup ??
        payload?.call?.isGroup ??
        payload?.call?.IsGroup ??
        payload?.data?.isGroup ??
        payload?.data?.IsGroup
      ),
      isRelayLatency: normalizedEvent === 'callrelaylatency' || normalizedEvent.includes('relaylatency'),
    };
  }

  private buildCallLogMessage(call: { status?: string; callType: 'audio' | 'video' }): string {
    const status = this.normalizeCallStatus(call.status);
    const typeLabel = call.callType === 'video' ? 'video' : 'audio';
    return [
      `Ligacao de ${typeLabel} recebida via WhatsApp.`,
      status ? `Status: ${status}.` : undefined,
      'Registro automatico gerado pelo webhook da Evolution.',
    ].filter(Boolean).join('\n');
  }

  private normalizeCallStatus(status?: string): string | null {
    const normalized = String(status ?? '').trim().toLowerCase();
    if (!normalized) return null;
    if (normalized === 'true') return 'atendida';
    if (normalized === 'false') return 'nao atendida';
    if (normalized.includes('offer') || normalized.includes('ring')) return 'recebida';
    if (normalized.includes('reject') || normalized.includes('miss')) return 'nao atendida';
    if (normalized.includes('timeout')) return 'nao atendida';
    if (normalized.includes('accept')) return 'atendida';
    if (normalized.includes('terminate') || normalized.includes('end')) return 'encerrada';
    return normalized;
  }

  private extractPhoneFromJidOrNumber(value?: string): string | null {
    const normalized = String(value ?? '').trim();
    if (!normalized) return null;
    const lower = normalized.toLowerCase();

    if (
      lower === 'status@broadcast' ||
      lower.endsWith('@broadcast') ||
      lower.endsWith('@g.us') ||
      lower.endsWith('@lid')
    ) {
      return null;
    }

    const supportedJidMatch = lower.match(/^([^@]+)@(s\.whatsapp\.net|c\.us)$/);
    if (supportedJidMatch) {
      const jidUser = supportedJidMatch[1].split(':')[0] ?? supportedJidMatch[1];
      return this.normalizeSupportedPhoneDigits(jidUser.replace(/\D/g, ''));
    }

    if (lower.includes('@')) {
      return null;
    }

    return this.normalizeSupportedPhoneDigits(normalized.replace(/\D/g, ''));
  }

  private normalizeSupportedPhoneDigits(digits: string): string | null {
    if (!digits) return null;

    if (digits.startsWith('55')) {
      return digits.length === 12 || digits.length === 13 ? digits : null;
    }

    if (digits.length === 10 || digits.length === 11) {
      return `55${digits}`;
    }

    if (digits.startsWith('1')) {
      return digits.length === 11 ? digits : null;
    }

    return digits.length >= 8 && digits.length <= 15 ? digits : null;
  }

  private readFirstSupportedPhoneSource(...values: unknown[]): string | undefined {
    for (const value of values) {
      const normalized = String(value ?? '').trim();
      if (!normalized) continue;
      if (this.extractPhoneFromJidOrNumber(normalized)) return normalized;
    }
    return undefined;
  }

  private readFirstString(...values: unknown[]): string | undefined {
    for (const value of values) {
      const normalized = String(value ?? '').trim();
      if (normalized) return normalized;
    }
    return undefined;
  }

  private isAllowedGroupJid(groupJid: string, connection: ResolvedIntegrationContext): boolean {
    const allowed = [
      ...(connection.evolution.allowedGroupJids ?? []),
      ...(connection.evolution.allowedGroups ?? []).map((item) => item.jid),
    ];
    return allowed.map((item) => item.toLowerCase()).includes(groupJid.trim().toLowerCase());
  }

  private prefixGroupMessage(
    content: string,
    context: { pushName?: string; participantJid?: string }
  ): string {
    const participantPhone = this.extractPhoneFromJidOrNumber(context.participantJid);
    const label = [
      context.pushName?.trim() || 'Participante',
      participantPhone ? `(${participantPhone})` : undefined,
    ].filter(Boolean).join(' ');
    const normalizedContent = String(content ?? '').trim();
    return normalizedContent
      ? `${label}: ${normalizedContent}`
      : `${label} enviou uma midia no grupo.`;
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
    const state = String(
      payload?.state ??
      payload?.State ??
      payload?.status ??
      payload?.data?.state ??
      payload?.data?.State ??
      payload?.data?.status ??
      ''
    ).trim();
    const chatwootStatus = this.mapReceiptStateToChatwoot(state);
    if (!chatwootStatus) return null;

    const rawMessageIds =
      payload?.MessageIDs ??
      payload?.messageIds ??
      payload?.data?.MessageIDs ??
      payload?.data?.messageIds ??
      payload?.key?.id ??
      payload?.data?.key?.id;
    const messageIds = (Array.isArray(rawMessageIds) ? rawMessageIds : [rawMessageIds])
      .map((value: unknown) => String(value ?? '').trim())
      .filter((value: string) => value.length > 0);

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

  private async resolveOrCreateGroupConversationLink(
    groupJid: string,
    connection: ResolvedIntegrationContext
  ): Promise<{ contactIdentifier: string; conversationId: string }> {
    const normalizedGroupJid = groupJid.trim();
    const lockKey = `${connection.connectionKey}:${normalizedGroupJid}`;

    return this.withConversationLinkLock(lockKey, async () => {
      let link = await this.prisma.conversationLink.findUnique({
        where: {
          connectionKey_whatsappNumber: {
            connectionKey: connection.connectionKey,
            whatsappNumber: normalizedGroupJid,
          },
        },
      });
      const linkExisted = Boolean(link);

      if (!link) {
        const groupName = this.resolveAllowedGroupName(normalizedGroupJid, connection);
        const contactResponse = (await this.chatwootClient.createOrFindContactByIdentifier(
          connection.chatwoot,
          normalizedGroupJid,
          groupName,
          {
            source: 'WHATSAPP_GROUP',
            connectionKey: connection.connectionKey,
          },
        )) as any;
        const contact = contactResponse?.payload?.contact;
        const contactIdentifier = await this.resolveChatwootContactIdentifier(connection, contact);

        if (!contactIdentifier) {
          throw new Error(`Nao foi possivel resolver source_id do grupo no Chatwoot (groupJid=${normalizedGroupJid})`);
        }

        const convResponse = (await this.chatwootClient.createConversation(
          connection.chatwoot,
          contactIdentifier,
          contact?.id?.toString?.(),
        )) as any;
        const conversationId =
          convResponse?.id?.toString?.() ??
          convResponse?.payload?.id?.toString?.() ??
          convResponse?.conversation?.id?.toString?.();

        if (!conversationId) {
          throw new Error(`Nao foi possivel resolver id da conversa de grupo no Chatwoot (groupJid=${normalizedGroupJid})`);
        }

        try {
          link = await this.prisma.conversationLink.create({
            data: {
              companyId: connection.companyId ?? null,
              connectionId: connection.connectionId,
              connectionKey: connection.connectionKey,
              whatsappNumber: normalizedGroupJid,
              chatwootContactId: contactIdentifier,
              chatwootConversationId: conversationId,
            },
          });
        } catch (error: any) {
          if (error?.code === 'P2002') {
            link = await this.prisma.conversationLink.findUnique({
              where: {
                connectionKey_whatsappNumber: {
                  connectionKey: connection.connectionKey,
                  whatsappNumber: normalizedGroupJid,
                },
              },
            });
          } else {
            throw error;
          }
        }
      }

      if (!link?.chatwootContactId || !link?.chatwootConversationId) {
        throw new Error(`Vinculo de grupo invalido para ${normalizedGroupJid}`);
      }

      this.logger.log(JSON.stringify({
        flow: 'evolution_to_chatwoot',
        stage: 'group_link_resolved',
        groupJid: normalizedGroupJid,
        contactIdentifier: link.chatwootContactId,
        conversationId: link.chatwootConversationId,
        isNew: !linkExisted,
        connectionKey: connection.connectionKey,
      }));

      return {
        contactIdentifier: link.chatwootContactId,
        conversationId: link.chatwootConversationId,
      };
    });
  }

  private resolveAllowedGroupName(groupJid: string, connection: ResolvedIntegrationContext): string {
    const match = (connection.evolution.allowedGroups ?? [])
      .find((item) => item.jid.trim().toLowerCase() === groupJid.toLowerCase());
    return match?.name?.trim() || `Grupo WhatsApp - ${groupJid.split('@')[0]}`;
  }

  private async resolveChatwootContactIdentifier(
    connection: ResolvedIntegrationContext,
    contact: any,
  ): Promise<string | undefined> {
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

    return sourceIdFromEmbeddedInbox ?? sourceIdFromContactableInbox;
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
          include: {
            companyLinks: {
              where: { isPrimary: true },
              take: 1,
              include: { company: true },
            },
          },
        });

        if (!sysproContact) {
          sysproContact = await this.prisma.companyContact.create({
            data: {
              name: String(pushName),
              whatsapp: String(phone),
              source: 'WHATSAPP',
              status: connection.companyId ? 'LINKED' : 'PENDING_LINK',
              ...(connection.companyId
                ? {
                    companyLinks: {
                      create: {
                        companyId: connection.companyId,
                        isPrimary: true,
                      },
                    },
                  }
                : {}),
            },
            include: {
              companyLinks: {
                where: { isPrimary: true },
                take: 1,
                include: { company: true },
              },
            },
          });
        }

        if (!sysproContact) throw new Error('Falha ao processar o contato no banco de dados');

        const primaryCompany = sysproContact.companyLinks[0]?.company;
        const primaryCompanyId = sysproContact.companyLinks[0]?.companyId;
        const contactName = primaryCompany
          ? `${sysproContact.name} - ${primaryCompany.nomeFantasia || primaryCompany.razaoSocial}`
          : sysproContact.name;

        let picResult: { profilePictureUrl?: string } = {};
        try {
          picResult = await this.evolutionClient.fetchProfilePicture(connection.evolution, phone);
        } catch (error: any) {
          this.logger.warn(
            `[evolution_to_chatwoot] fetchProfilePicture falhou para ${phone}; seguindo sem avatar: ${error?.message ?? 'unknown_error'}`
          );
        }
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
              companyId: primaryCompanyId ?? connection.companyId ?? null,
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

      await this.reactivateArchivedContactIfNeeded(phone, connection, {
        contactIdentifier,
        conversationId,
      });

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

  private async reactivateArchivedContactIfNeeded(
    phone: string,
    connection: ResolvedIntegrationContext,
    chatwootLink: { contactIdentifier?: string | null; conversationId?: string | null },
  ) {
    const contact = await this.prisma.companyContact.findFirst({
      where: {
        whatsapp: phone,
        status: CompanyContactStatus.ARCHIVED,
      },
      include: {
        companyLinks: {
          select: { id: true },
          take: 1,
        },
      },
    });

    if (!contact) return;

    const nextStatus = contact.companyLinks.length
      ? CompanyContactStatus.LINKED
      : CompanyContactStatus.PENDING_LINK;
    await this.prisma.companyContact.update({
      where: { id: contact.id },
      data: { status: nextStatus },
    });

    try {
      if (chatwootLink.contactIdentifier) {
        await this.chatwootClient.updateContact(connection.chatwoot, chatwootLink.contactIdentifier, {
          phone_number: phone.startsWith('+') ? phone : `+${phone}`,
          custom_attributes: {
            syspro_contact_id: contact.id,
            syspro_contact_name: contact.name,
            syspro_contact_status: nextStatus,
            syspro_contact_active: true,
            syspro_contact_archived_at: null,
          },
        });
      }

      if (chatwootLink.conversationId) {
        await this.chatwootClient.updateConversationCustomAttributes(
          connection.chatwoot,
          chatwootLink.conversationId,
          {
            syspro_contact_id: contact.id,
            syspro_contact_name: contact.name,
            syspro_contact_status: nextStatus,
            syspro_contact_active: true,
          },
        );
      }
    } catch (error: any) {
      this.logger.warn(JSON.stringify({
        flow: 'evolution_to_chatwoot',
        stage: 'archived_contact_reactivated_chatwoot_sync_failed',
        whatsappNumber: phone,
        contactId: contact.id,
        connectionKey: connection.connectionKey,
        error: error?.message ?? 'unknown_error',
      }));
    }

    this.logger.log(JSON.stringify({
      flow: 'evolution_to_chatwoot',
      stage: 'archived_contact_reactivated',
      whatsappNumber: phone,
      contactId: contact.id,
      status: nextStatus,
      connectionKey: connection.connectionKey,
    }));
  }
}
