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
    const expectedInstanceToken = resolvedContext?.evolution.instanceToken;
    const payloadInstanceToken = payload?.instanceToken?.toString?.();

    if (expectedInstanceToken && payloadInstanceToken !== expectedInstanceToken) {
      throw new UnauthorizedException('Invalid Evolution instance token');
    }

    const normalizedEvent = String(payload?.event ?? '').trim().toLowerCase();
    const isInboundMessageEvent = normalizedEvent === 'message';
    const isReceiptEvent = normalizedEvent === 'receipt';

    if (isInboundMessageEvent) {
      await this.processIncomingMessage.execute(payload.data, {
        instanceId: payload?.instanceId?.toString(),
        connection: resolvedContext ?? undefined,
      });
    } else if (isReceiptEvent) {
      await this.processIncomingMessage.handleStatusUpdate(
        payload,
        {
          instanceId: payload?.instanceId?.toString(),
          connection: resolvedContext ?? undefined,
        }
      );
    }
    return { ok: true };
  }
}
