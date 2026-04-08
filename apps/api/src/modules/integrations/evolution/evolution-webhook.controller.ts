import { Controller, Post, Body, Headers, UnauthorizedException, HttpCode, HttpStatus } from '@nestjs/common';
import { ProcessIncomingMessageUseCase } from '../messaging/application/process-incoming-message.usecase';

@Controller('webhooks/evolution')
export class EvolutionWebhookController {
  constructor(private readonly processIncomingMessage: ProcessIncomingMessageUseCase) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async handle(
    @Body() payload: any
  ) {
    const expectedInstanceToken = process.env.EVOLUTION_INSTANCE_TOKEN;
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
      });
    } else if (isReceiptEvent) {
      await this.processIncomingMessage.handleStatusUpdate(
        payload,
        { instanceId: payload?.instanceId?.toString() }
      );
    }
    return { ok: true };
  }
}
