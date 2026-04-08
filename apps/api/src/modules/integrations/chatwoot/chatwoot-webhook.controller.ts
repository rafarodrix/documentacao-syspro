import {
  Controller,
  Post,
  Body,
  Headers,
  Req,
  Logger,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';
import { ProcessOutgoingMessageUseCase } from '../messaging/application/process-outgoing-message.usecase';
import { PrismaService } from '../../../../prisma/prisma.service';

@Controller('webhooks/chatwoot')
export class ChatwootWebhookController {
  private readonly logger = new Logger(ChatwootWebhookController.name);

  constructor(
    private readonly processOutgoingMessage: ProcessOutgoingMessageUseCase,
    private readonly prisma: PrismaService
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async handle(
    @Headers('x-chatwoot-signature') signatureHeader: string,
    @Headers('x-chatwoot-timestamp') timestampHeader: string,
    @Req() req: any,
    @Body() payload: any,
  ) {
    const expectedSecret = process.env.CHATWOOT_WEBHOOK_SECRET;
    if (expectedSecret) {
      if (!signatureHeader || !timestampHeader) {
        throw new UnauthorizedException('Missing Chatwoot webhook signature headers');
      }

      const rawBodyBuffer = req?.rawBody as Buffer | undefined;
      if (!rawBodyBuffer) {
        throw new UnauthorizedException('Missing raw body for Chatwoot signature validation');
      }

      if (!this.isTimestampFresh(timestampHeader)) {
        throw new UnauthorizedException('Stale Chatwoot webhook timestamp');
      }

      const expectedSignature = this.computeSignature(expectedSecret, timestampHeader, rawBodyBuffer.toString('utf8'));
      if (!this.safeCompare(expectedSignature, signatureHeader)) {
        throw new UnauthorizedException('Invalid Chatwoot webhook signature');
      }
    }

    switch (payload?.event) {
      case 'message_created':
        await this.processOutgoingMessage.execute(payload);
        break;
      case 'contact_updated':
        this.logger.log(`Sincronizacao pendente: Contato atualizado no Chatwoot (ID: ${payload?.id})`);
        if (payload?.id && payload?.name) {
          // Busca qual número de WhatsApp está vinculado a este ID do Chatwoot
          const link = await this.prisma.conversationLink.findFirst({
            where: { chatwootContactId: payload.id.toString() }
          });
          if (link) {
            // Atualiza o cadastro base (CompanyContact)
            const existingContact = await this.prisma.companyContact.findFirst({
              where: { whatsapp: link.whatsappNumber }
            });
            if (existingContact) {
              await this.prisma.companyContact.update({
                where: { id: existingContact.id },
                data: { name: payload.name } // Também poderia atualizar email, se adicionado ao schema
              });
              this.logger.log(`Contato ${link.whatsappNumber} atualizado no banco via Chatwoot: ${payload.name}`);
            }
          }
        }
        break;
      default:
        this.logger.debug(`Evento Chatwoot não processado/ignorado: ${payload?.event}`);
    }

    return { ok: true };
  }

  private computeSignature(secret: string, timestamp: string, rawBody: string): string {
    const signedPayload = `${timestamp}.${rawBody}`;
    const digest = createHmac('sha256', secret).update(signedPayload).digest('hex');
    return `sha256=${digest}`;
  }

  private safeCompare(a: string, b: string): boolean {
    const aBuffer = Buffer.from(a);
    const bBuffer = Buffer.from(b);
    if (aBuffer.length !== bBuffer.length) {
      return false;
    }
    return timingSafeEqual(aBuffer, bBuffer);
  }

  private isTimestampFresh(timestamp: string): boolean {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const value = Number(timestamp);
    if (!Number.isFinite(value)) {
      this.logger.warn(`Chatwoot timestamp invalido: ${timestamp}`);
      return false;
    }

    const maxSkewSeconds = Number(process.env.CHATWOOT_WEBHOOK_MAX_SKEW_SECONDS ?? '300');
    return Math.abs(nowSeconds - value) <= maxSkewSeconds;
  }
}
