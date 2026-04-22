import { Controller, Post, Body, UnauthorizedException, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { ProcessIncomingMessageUseCase } from '../messaging/application/process-incoming-message.usecase';
import { IntegrationContextService } from '../../settings/integration-context.service';
import { PrismaService } from '../../../prisma/prisma.service';

@Controller('webhooks/evolution')
export class EvolutionWebhookController {
  private readonly logger = new Logger(EvolutionWebhookController.name);
  private static readonly EVOLUTION_QRCODE_KEY_PREFIX = 'evolution_qrcode:';

  constructor(
    private readonly processIncomingMessage: ProcessIncomingMessageUseCase,
    private readonly integrationContext: IntegrationContextService,
    private readonly prisma: PrismaService,
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

    const normalizedEvent = String(payload?.event ?? '').trim().toLowerCase();
    const eventPayload = payload?.data ?? payload;
    if (normalizedEvent === 'qrcode') {
      await this.storeQrCodeEvent({
        eventPayload,
        instanceId: resolvedInstanceId || payloadInstanceId,
        connectionKey: resolvedContext.connectionKey,
      });
      return { ok: true };
    }

    const remoteJid = this.readRemoteJid(eventPayload);
    const isGroupMessageRoute =
      normalizedEvent === 'group' &&
      remoteJid.endsWith('@g.us') &&
      this.hasMessagePayload(eventPayload);
    const isInboundMessageEvent =
      normalizedEvent === 'message' ||
      normalizedEvent === 'messages.upsert' ||
      isGroupMessageRoute;
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
      normalizedEvent.startsWith('call.') ||
      normalizedEvent.startsWith('calls.');

    if (isInboundMessageEvent) {
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
      this.logger.debug(JSON.stringify({
        flow: 'evolution_to_chatwoot',
        stage: 'ignored_event',
        event: normalizedEvent || null,
        instanceId: resolvedInstanceId || null,
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
      payload?.data?.key?.remoteJid ??
      payload?.data?.Info?.Chat ??
      payload?.data?.info?.Chat ??
      payload?.data?.remoteJid ??
      ''
    ).trim();
  }

  private hasMessagePayload(payload: any): boolean {
    const message = payload?.message ?? payload?.Message ?? payload?.data?.message ?? payload?.data?.Message;
    return Boolean(
      message?.conversation ||
      message?.extendedTextMessage ||
      message?.imageMessage ||
      message?.videoMessage ||
      message?.documentMessage ||
      message?.audioMessage
    );
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

    this.logger.log(JSON.stringify({
      flow: 'evolution_to_chatwoot',
      stage: 'qrcode_event_stored',
      instanceId,
      connectionKey: input.connectionKey,
      hasQrCode: Boolean(qrCode),
      hasCode: Boolean(code),
    }));
  }

  private readOptionalString(value: unknown): string | null {
    const normalized = String(value ?? '').trim();
    return normalized || null;
  }
}
