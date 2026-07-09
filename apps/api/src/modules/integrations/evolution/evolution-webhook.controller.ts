import { Controller, Post, Body, UnauthorizedException, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { ProcessIncomingMessageUseCase } from '../messaging/application/process-incoming-message.usecase';
import { IntegrationContextService, type ResolvedIntegrationContext } from '../../settings/integration-context.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { ChatwootClient } from '../chatwoot/chatwoot.client';

@Controller('webhooks/evolution')
export class EvolutionWebhookController {
  private readonly logger = new Logger(EvolutionWebhookController.name);
  private static readonly EVOLUTION_QRCODE_KEY_PREFIX = 'evolution_qrcode:';
  private static readonly EVOLUTION_STATUS_KEY_PREFIX = 'evolution_status:';

  constructor(
    private readonly processIncomingMessage: ProcessIncomingMessageUseCase,
    private readonly integrationContext: IntegrationContextService,
    private readonly prisma: PrismaService,
    private readonly chatwootClient: ChatwootClient,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async handle(
    @Body() payload: any
  ) {
    const resolvedContext = await this.integrationContext.resolveForEvolutionWebhook(payload);
    const payloadInstanceId =
      payload?.instanceId?.toString?.() ??
      payload?.data?.instanceId?.toString?.() ??
      payload?.data?.instance?.instanceId?.toString?.() ??
      payload?.data?.instance?.id?.toString?.() ??
      payload?.instance?.instanceId?.toString?.() ??
      payload?.instance?.id?.toString?.() ??
      '';
    const payloadInstanceName =
      payload?.instance?.toString?.() ??
      payload?.instanceName?.toString?.() ??
      payload?.data?.instance?.toString?.() ??
      payload?.data?.instanceName?.toString?.() ??
      payload?.data?.instance?.instanceName?.toString?.() ??
      payload?.data?.instance?.name?.toString?.() ??
      '';

    if (!resolvedContext) {
      this.logger.warn(
        `Evolution webhook unauthorized: no active connection matched. event=${String(payload?.event ?? '').trim() || 'unknown'} instanceId=${payloadInstanceId || 'n/a'} instance=${payloadInstanceName || 'n/a'}`,
      );
      throw new UnauthorizedException('No active Evolution integration matched this webhook');
    }
    const expectedInstanceToken = resolvedContext?.evolution.instanceToken;
    const payloadInstanceToken = payload?.instanceToken?.toString?.();
    const resolvedInstanceId =
      payload?.instanceId?.toString?.() ??
      payload?.data?.instanceId?.toString?.();

    if (expectedInstanceToken && payloadInstanceToken !== expectedInstanceToken) {
      this.logger.warn(
        `Evolution webhook unauthorized: invalid instance token. connectionKey=${resolvedContext.connectionKey} instanceId=${payloadInstanceId || 'n/a'} instance=${payloadInstanceName || 'n/a'}`,
      );
      throw new UnauthorizedException('Invalid Evolution instance token');
    }

    const normalizedEvent = this.normalizeEvolutionEventName(payload?.event);
    const eventPayload = payload?.data ?? payload;
    if (this.isConnectionLifecycleEvent(normalizedEvent)) {
      await this.storeConnectionLifecycleEvent({
        event: normalizedEvent,
        eventPayload,
        instanceId: resolvedInstanceId || payloadInstanceId,
        connectionKey: resolvedContext.connectionKey,
        connection: resolvedContext,
      });
    }

    if (normalizedEvent === 'qrcode') {
      await this.storeQrCodeEvent({
        eventPayload,
        instanceId: resolvedInstanceId || payloadInstanceId,
        connectionKey: resolvedContext.connectionKey,
      });
      return { ok: true };
    }

    if (normalizedEvent === 'qrtimeout' || normalizedEvent === 'qrsuccess') {
      return { ok: true };
    }

    const remoteJid = this.readRemoteJid(eventPayload);
    const isGroupMessageRoute =
      normalizedEvent === 'group' &&
      remoteJid.endsWith('@g.us') &&
      this.hasMessagePayload(eventPayload);
    const isContactMessageRoute =
      normalizedEvent === 'contact' &&
      this.hasMessagePayload(eventPayload);
    const isInboundMessageEvent =
      normalizedEvent === 'message' ||
      normalizedEvent === 'messages.upsert' ||
      isContactMessageRoute ||
      isGroupMessageRoute;
    const isDeleteEvent =
      normalizedEvent === 'messages.delete' ||
      normalizedEvent === 'message.delete' ||
      this.hasDeletePayload(eventPayload);
    const isEditEvent =
      normalizedEvent === 'messages.edit' ||
      normalizedEvent === 'message.edit' ||
      this.hasEditPayload(eventPayload);
    const isReceiptEvent =
      normalizedEvent === 'receipt' ||
      normalizedEvent === 'read_receipt' ||
      normalizedEvent === 'messages.update';
    const isCallEvent =
      normalizedEvent === 'call' ||
      normalizedEvent === 'calls' ||
      normalizedEvent === 'calloffer' ||
      normalizedEvent === 'callrelaylatency' ||
      normalizedEvent === 'callterminate' ||
      (normalizedEvent === 'contact' && this.hasCallPayload(eventPayload)) ||
      normalizedEvent.startsWith('call.') ||
      normalizedEvent.startsWith('calls.');

    if (isDeleteEvent) {
      await this.processIncomingMessage.handleDeleteEvent(eventPayload, {
        instanceId: resolvedInstanceId,
        connection: resolvedContext,
      });
    } else if (isEditEvent) {
      await this.processIncomingMessage.handleEditEvent(eventPayload, {
        instanceId: resolvedInstanceId,
        connection: resolvedContext,
      });
    } else if (isInboundMessageEvent) {
      await this.processIncomingMessage.execute(eventPayload, {
        instanceId: resolvedInstanceId,
        connection: resolvedContext,
      });
    } else if (isReceiptEvent) {
      await this.processIncomingMessage.handleStatusUpdate(
        eventPayload,
        {
          instanceId: resolvedInstanceId,
          connection: resolvedContext,
        }
      );
    } else if (isCallEvent) {
      await this.processIncomingMessage.handleCallEvent(payload?.data ?? payload, {
        event: normalizedEvent,
        instanceId: resolvedInstanceId,
        connection: resolvedContext,
      });
    } else {
      const isNoiseEvent =
        normalizedEvent === 'chatpresence' ||
        normalizedEvent === 'presence' ||
        normalizedEvent === 'presence.update';
      if (isNoiseEvent) {
        return { ok: true };
      }
      this.logger.debug(JSON.stringify({
        flow: 'evolution_to_chatwoot',
        stage: 'ignored_event',
        event: normalizedEvent || null,
        instanceId: resolvedInstanceId || null,
        remoteJid: remoteJid || null,
        hasMessagePayload: this.hasMessagePayload(eventPayload),
        hasCallPayload: this.hasCallPayload(eventPayload),
        payloadKeys: this.listPayloadKeys(eventPayload),
      }));
    }
    return { ok: true };
  }

  private readRemoteJid(payload: any): string {
    return String(
      payload?.key?.remoteJid ??
      payload?.Info?.Chat ??
      payload?.info?.Chat ??
      payload?.remoteJid ??
      payload?.chatId ??
      payload?.Chat ??
      payload?.chat ??
      payload?.sender ??
      payload?.Sender ??
      payload?.senderAlt ??
      payload?.SenderAlt ??
      payload?.data?.key?.remoteJid ??
      payload?.data?.Info?.Chat ??
      payload?.data?.info?.Chat ??
      payload?.data?.remoteJid ??
      payload?.data?.chatId ??
      payload?.data?.Chat ??
      payload?.data?.chat ??
      payload?.data?.sender ??
      payload?.data?.Sender ??
      payload?.data?.senderAlt ??
      payload?.data?.SenderAlt ??
      ''
    ).trim();
  }

  private normalizeEvolutionEventName(value: unknown): string {
    return String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9.]/g, '');
  }

  private hasMessagePayload(payload: any): boolean {
    const message = payload?.message ?? payload?.Message ?? payload?.data?.message ?? payload?.data?.Message;
    return Boolean(
      message?.conversation ||
      message?.extendedTextMessage ||
      message?.reactionMessage ||
      message?.stickerMessage ||
      message?.imageMessage ||
      message?.videoMessage ||
      message?.documentMessage ||
      message?.audioMessage
    );
  }

  private hasCallPayload(payload: any): boolean {
    const status = this.readOptionalString(
      payload?.status ??
      payload?.Status ??
      payload?.type ??
      payload?.Type ??
      payload?.callStatus ??
      payload?.CallStatus ??
      payload?.call?.status ??
      payload?.call?.Status ??
      payload?.data?.status ??
      payload?.data?.Status ??
      payload?.data?.type ??
      payload?.data?.Type,
    )?.toLowerCase();

    return Boolean(
      payload?.call ||
      payload?.calls ||
      payload?.callId ||
      payload?.CallID ||
      payload?.CallId ||
      payload?.call_id ||
      payload?.callCreator ||
      payload?.CallCreator ||
      payload?.call?.id ||
      payload?.call?.callCreator ||
      payload?.data?.call ||
      payload?.data?.calls ||
      payload?.data?.callId ||
      payload?.data?.CallID ||
      payload?.data?.CallId ||
      payload?.data?.call_id ||
      payload?.data?.callCreator ||
      payload?.data?.CallCreator ||
      status?.includes('call') ||
      status?.includes('offer') ||
      status?.includes('ring') ||
      status?.includes('miss') ||
      status?.includes('reject') ||
      status?.includes('terminate') ||
      status?.includes('accept')
    );
  }

  private hasDeletePayload(payload: any): boolean {
    return Boolean(
      payload?.targetMessageId ||
      payload?.TargetMessageID ||
      payload?.deleted === true ||
      payload?.isDeleted === true ||
      payload?.protocolMessage?.key?.id ||
      payload?.message?.protocolMessage?.key?.id ||
      payload?.Message?.protocolMessage?.key?.id ||
      payload?.data?.MessageID ||
      payload?.data?.targetMessageId ||
      payload?.data?.TargetMessageID ||
      payload?.data?.deleted === true ||
      payload?.data?.isDeleted === true ||
      payload?.data?.protocolMessage?.key?.id ||
      payload?.data?.message?.protocolMessage?.key?.id ||
      payload?.data?.Message?.protocolMessage?.key?.id
    );
  }

  private hasEditPayload(payload: any): boolean {
    return Boolean(
      payload?.EditTargetID ||
      payload?.editTargetId ||
      payload?.message?.editedMessage ||
      payload?.data?.EditTargetID ||
      payload?.data?.editTargetId ||
      payload?.data?.message?.editedMessage
    );
  }

  private listPayloadKeys(payload: any): string[] {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return [];
    return Object.keys(payload).slice(0, 20);
  }

  private async storeQrCodeEvent(input: {
    eventPayload: any;
    instanceId: string;
    connectionKey: string;
  }) {
    const instanceId = String(input.instanceId ?? '').trim();
    if (!instanceId) {
      this.logger.warn(JSON.stringify({
        flow: 'evolution_to_chatwoot',
        stage: 'qrcode_event_missing_instance_id',
        connectionKey: input.connectionKey,
      }));
      return;
    }

    const qrCode =
      this.readOptionalString(input.eventPayload?.qrcode) ??
      this.readOptionalString(input.eventPayload?.qrCode) ??
      this.readOptionalString(input.eventPayload?.QRCode) ??
      this.readOptionalString(input.eventPayload?.base64);
    const code =
      this.readOptionalString(input.eventPayload?.code) ??
      this.readOptionalString(input.eventPayload?.Code);

    await this.prisma.systemSetting.upsert({
      where: { key: `${EvolutionWebhookController.EVOLUTION_QRCODE_KEY_PREFIX}${instanceId}` },
      update: {
        value: JSON.stringify({
          instanceId,
          connectionKey: input.connectionKey,
          qrCode,
          code,
          receivedAt: new Date().toISOString(),
        }),
      },
      create: {
        key: `${EvolutionWebhookController.EVOLUTION_QRCODE_KEY_PREFIX}${instanceId}`,
        value: JSON.stringify({
          instanceId,
          connectionKey: input.connectionKey,
          qrCode,
          code,
          receivedAt: new Date().toISOString(),
        }),
        description: 'Ultimo QR Code recebido da Evolution Go',
      },
    });

    await this.upsertEvolutionStatus({
      instanceId,
      connectionKey: input.connectionKey,
      event: 'QRCode',
      status: 'QR_CODE',
      details: {
        hasQrCode: Boolean(qrCode),
        hasCode: Boolean(code),
      },
    });

    this.logger.log(JSON.stringify({
      flow: 'evolution_to_chatwoot',
      stage: 'qrcode_event_stored',
      instanceId,
      connectionKey: input.connectionKey,
      hasQrCode: Boolean(qrCode),
      hasCode: Boolean(code),
    }));
  }

  private isConnectionLifecycleEvent(event: string): boolean {
    return [
      'qrcode',
      'qrtimeout',
      'qrsuccess',
      'pairsuccess',
      'connected',
      'loggedout',
      'offlinesynccompleted',
    ].includes(event);
  }

  private async storeConnectionLifecycleEvent(input: {
    event: string;
    eventPayload: any;
    instanceId: string;
    connectionKey: string;
    connection: ResolvedIntegrationContext;
  }) {
    const instanceId = String(input.instanceId ?? '').trim();
    if (!instanceId) {
      this.logger.warn(JSON.stringify({
        flow: 'evolution_to_chatwoot',
        stage: 'connection_lifecycle_missing_instance_id',
        event: input.event,
        connectionKey: input.connectionKey,
      }));
      return;
    }

    const status = this.mapConnectionLifecycleStatus(input.event);
    const previousStatus = await this.upsertEvolutionStatus({
      instanceId,
      connectionKey: input.connectionKey,
      event: input.event,
      status,
      details: {
        platform: this.readOptionalString(input.eventPayload?.Platform ?? input.eventPayload?.platform),
        jid: this.readOptionalString(input.eventPayload?.jid ?? input.eventPayload?.ID),
        pushName: this.readOptionalString(input.eventPayload?.pushName ?? input.eventPayload?.PushName),
        providerStatus: this.readOptionalString(input.eventPayload?.status ?? input.eventPayload?.Status),
      },
    });

    if (status === 'LOGGED_OUT' || status === 'QR_TIMEOUT') {
      await this.notifyRecentChatwootConversations({
        status,
        event: input.event,
        instanceId,
        connection: input.connection,
        previousStatus,
      });
    }

    this.logger.log(JSON.stringify({
      flow: 'evolution_to_chatwoot',
      stage: 'connection_lifecycle_stored',
      event: input.event,
      status,
      instanceId,
      connectionKey: input.connectionKey,
    }));
  }

  private mapConnectionLifecycleStatus(event: string): string {
    switch (event) {
      case 'qrcode':
        return 'QR_CODE';
      case 'qrtimeout':
        return 'QR_TIMEOUT';
      case 'qrsuccess':
      case 'pairsuccess':
        return 'PAIRED';
      case 'connected':
      case 'offlinesynccompleted':
        return 'CONNECTED';
      case 'loggedout':
        return 'LOGGED_OUT';
      default:
        return 'UNKNOWN';
    }
  }

  private async upsertEvolutionStatus(input: {
    instanceId: string;
    connectionKey: string;
    event: string;
    status: string;
    details?: Record<string, unknown>;
  }): Promise<{ status: string | null; receivedAt: string | null }> {
    const previous = await this.prisma.systemSetting.findUnique({
      where: { key: `${EvolutionWebhookController.EVOLUTION_STATUS_KEY_PREFIX}${input.instanceId}` },
      select: { value: true, updatedAt: true },
    });
    const payload = {
      instanceId: input.instanceId,
      connectionKey: input.connectionKey,
      event: input.event,
      status: input.status,
      details: input.details ?? {},
      receivedAt: new Date().toISOString(),
    };

    await this.prisma.systemSetting.upsert({
      where: { key: `${EvolutionWebhookController.EVOLUTION_STATUS_KEY_PREFIX}${input.instanceId}` },
      update: { value: JSON.stringify(payload) },
      create: {
        key: `${EvolutionWebhookController.EVOLUTION_STATUS_KEY_PREFIX}${input.instanceId}`,
        value: JSON.stringify(payload),
        description: 'Ultimo status operacional recebido da Evolution Go',
      },
    });

    if (!previous?.value) {
      return { status: null, receivedAt: null };
    }

    try {
      const parsed = JSON.parse(previous.value);
      return {
        status: this.readOptionalString(parsed?.status),
        receivedAt: this.readOptionalString(parsed?.receivedAt) ?? previous.updatedAt.toISOString(),
      };
    } catch {
      return { status: null, receivedAt: previous.updatedAt.toISOString() };
    }
  }

  private async notifyRecentChatwootConversations(input: {
    status: string;
    event: string;
    instanceId: string;
    connection: ResolvedIntegrationContext;
    previousStatus: { status: string | null; receivedAt: string | null };
  }) {
    if (!input.connection.chatwoot.url || !input.connection.chatwoot.apiToken || !input.connection.chatwoot.accountId) {
      return;
    }

    const previousReceivedAt = input.previousStatus.receivedAt ? new Date(input.previousStatus.receivedAt) : null;
    const repeatedRecently =
      input.previousStatus.status === input.status &&
      previousReceivedAt instanceof Date &&
      !Number.isNaN(previousReceivedAt.getTime()) &&
      Date.now() - previousReceivedAt.getTime() < 15 * 60 * 1000;
    if (repeatedRecently) {
      return;
    }

    const links = await this.prisma.conversationLink.findMany({
      where: { connectionKey: input.connection.connectionKey },
      orderBy: { updatedAt: 'desc' },
      take: 5,
      select: { chatwootConversationId: true },
    });

    if (links.length === 0) {
      return;
    }

    const content = this.buildOperationalChatwootNote(input.status, input.event, input.instanceId);
    const systemBotApiToken = await this.integrationContext.getChatwootSystemBotApiToken();
    const chatwootConfig = systemBotApiToken
      ? { ...input.connection.chatwoot, systemBotApiToken }
      : input.connection.chatwoot;
    const results = await Promise.allSettled(
      links.map((link) =>
        this.chatwootClient.createPrivateNote(
          chatwootConfig,
          link.chatwootConversationId,
          content,
          { useSystemBot: Boolean(systemBotApiToken) },
        )
      )
    );

    this.logger.log(JSON.stringify({
      flow: 'evolution_to_chatwoot',
      stage: 'chatwoot_operational_notes_dispatched',
      status: input.status,
      instanceId: input.instanceId,
      attempted: links.length,
      failed: results.filter((result) => result.status === 'rejected').length,
    }));
  }

  private buildOperationalChatwootNote(status: string, event: string, instanceId: string) {
    if (status === 'LOGGED_OUT') {
      return `[Evolution Go] Instancia ${instanceId} desconectada pelo evento ${event}. Verifique a aba Configuracoes > WhatsApp / Evolution Go para reconectar.`;
    }

    return `[Evolution Go] QR Code da instancia ${instanceId} expirou pelo evento ${event}. Gere um novo QR Code na aba Configuracoes > WhatsApp / Evolution Go.`;
  }

  private readOptionalString(value: unknown): string | null {
    const normalized = String(value ?? '').trim();
    return normalized || null;
  }
}
