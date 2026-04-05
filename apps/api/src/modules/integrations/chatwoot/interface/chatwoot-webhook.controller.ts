import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ProcessOutgoingMessageUseCase } from '../../messaging/application/process-outgoing-message.usecase';

@Controller('webhooks/chatwoot')
export class ChatwootWebhookController {
  constructor(private readonly processOutgoingMessage: ProcessOutgoingMessageUseCase) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async handle(@Body() payload: any) {
    // Chatwoot dispara o evento "message_created"
    if (payload?.event === 'message_created') {
      await this.processOutgoingMessage.execute(payload);
    }

    return { ok: true };
  }
}