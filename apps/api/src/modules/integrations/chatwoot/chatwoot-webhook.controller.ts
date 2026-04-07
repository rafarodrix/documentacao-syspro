import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { ProcessOutgoingMessageUseCase } from '../messaging/application/process-outgoing-message.usecase';

@Controller('webhooks/chatwoot')
export class ChatwootWebhookController {
  constructor(private readonly processOutgoingMessage: ProcessOutgoingMessageUseCase) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async handle(
    @Headers('x-webhook-secret') secretHeader: string,
    @Body() payload: any,
  ) {
    const expectedSecret = process.env.CHATWOOT_WEBHOOK_SECRET;
    if (expectedSecret && secretHeader !== expectedSecret) {
      throw new UnauthorizedException('Invalid Chatwoot webhook secret');
    }

    // Chatwoot dispara o evento "message_created"
    if (payload?.event === 'message_created') {
      await this.processOutgoingMessage.execute(payload);
    }

    return { ok: true };
  }
}
