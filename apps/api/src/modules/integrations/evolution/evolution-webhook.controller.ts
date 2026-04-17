import { Controller, Post, Body, UnauthorizedException, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { ProcessIncomingMessageUseCase } from '../messaging/application/process-incoming-message.usecase';
import { IntegrationContextService } from '../../settings/integration-context.service';

@Controller('webhooks/evolution')
export class EvolutionWebhookController {
  private readonly logger = new Logger(EvolutionWebhookController.name);

  constructor(
    private readonly processIncomingMessage: ProcessIncomingMessageUseCase,
    private readonly integrationContext: IntegrationContextService,
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
    const isInboundMessageEvent =
      normalizedEvent === 'message' ||
      normalizedEvent === 'messages.upsert';
    const isReceiptEvent =
      normalizedEvent === 'receipt' ||
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
      await this.processIncomingMessage.execute(payload?.data ?? payload, {
        instanceId: resolvedInstanceId,
        connection: resolvedContext,
      });
    } else if (isReceiptEvent) {
      await this.processIncomingMessage.handleStatusUpdate(
        normalizedEvent === 'messages.update' ? (payload?.data ?? payload) : payload,
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
}
