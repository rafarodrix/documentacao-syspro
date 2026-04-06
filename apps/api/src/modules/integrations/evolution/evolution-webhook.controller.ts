import { Controller, Post, Body, Headers, UnauthorizedException, HttpCode, HttpStatus } from '@nestjs/common';
import { ProcessIncomingMessageUseCase } from '../messaging/application/process-incoming-message.usecase';

@Controller('webhooks/evolution')
export class EvolutionWebhookController {
  constructor(private readonly processIncomingMessage: ProcessIncomingMessageUseCase) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async handle(
    @Headers('x-webhook-secret') secretHeader: string,
    @Body() payload: any
  ) {
    const expectedSecret = process.env.EVOLUTION_WEBHOOK_SECRET;
    if (expectedSecret && secretHeader !== expectedSecret) {
      throw new UnauthorizedException('Invalid Evolution webhook secret');
    }

    if (payload?.event === 'messages.upsert' || payload?.event === 'MESSAGES_UPSERT') {
      await this.processIncomingMessage.execute(payload.data);
    }
    return { ok: true };
  }
}