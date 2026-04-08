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

    const normalizedEvent = String(payload?.event ?? '').trim().toLowerCase();
    const isInboundMessageEvent =
      normalizedEvent === 'message' ||
      normalizedEvent === 'messages.upsert' ||
      normalizedEvent === 'messages_upsert';

    const isUpdateEvent =
      normalizedEvent === 'messages.update' ||
      normalizedEvent === 'messages_update';

    if (isInboundMessageEvent) {
      await this.processIncomingMessage.execute(payload.data, {
        instanceId: payload?.instanceId?.toString(),
      });
    } else if (isUpdateEvent) {
      // Melhoria 4: Interceptar atualizacao de status (Check azul)
      // TODO: Usar APIs baseadas no messageId para atualizar UI do Chatwoot
      console.log('[Evolution Webhook] Status de mensagem atualizado (Read Receipt):', JSON.stringify(payload?.data));
    }
    return { ok: true };
  }
}
