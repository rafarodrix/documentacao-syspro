import { Controller, Post, Body, UnauthorizedException, HttpCode, HttpStatus } from '@nestjs/common';
import { ProcessIncomingMessageUseCase } from '../messaging/application/process-incoming-message.usecase';
import { IntegrationContextService } from '../../settings/integration-context.service';

@Controller('webhooks/evolution')
export class EvolutionWebhookController {
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
    if (!resolvedContext) {
      throw new UnauthorizedException('No active Evolution integration matched this webhook');
    }
    const expectedInstanceToken = resolvedContext?.evolution.instanceToken;
    const payloadInstanceToken = payload?.instanceToken?.toString?.();
    const resolvedInstanceId =
      payload?.instanceId?.toString?.() ??
      payload?.data?.instanceId?.toString?.();

    if (expectedInstanceToken && payloadInstanceToken !== expectedInstanceToken) {
      throw new UnauthorizedException('Invalid Evolution instance token');
    }

    const normalizedEvent = String(payload?.event ?? '').trim().toLowerCase();
    const isInboundMessageEvent =
      normalizedEvent === 'message' ||
      normalizedEvent === 'messages.upsert';
    const isReceiptEvent =
      normalizedEvent === 'receipt' ||
      normalizedEvent === 'messages.update';

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
    }
    return { ok: true };
  }
}
