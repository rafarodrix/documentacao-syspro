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
import { PrismaService } from '../../../prisma/prisma.service';
import { IntegrationContextService } from '../../settings/integration-context.service';

@Controller('webhooks/chatwoot')
export class ChatwootWebhookController {
  private readonly logger = new Logger(ChatwootWebhookController.name);

  constructor(
    private readonly processOutgoingMessage: ProcessOutgoingMessageUseCase,
    private readonly prisma: PrismaService,
    private readonly integrationContext: IntegrationContextService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async handle(
    @Headers('x-chatwoot-signature') signatureHeader: string,
    @Headers('x-chatwoot-timestamp') timestampHeader: string,
    @Req() req: any,
    @Body() payload: any,
  ) {
    const resolvedContext = await this.integrationContext.resolveForChatwootWebhook(payload);
    const message = payload?.message && typeof payload.message === 'object' ? payload.message : null;
    if (payload?.event === 'message_created') {
      this.logger.log(JSON.stringify({
        flow: 'chatwoot_to_evolution',
        stage: 'webhook_received',
        event: payload?.event,
        messageId: payload?.id?.toString?.() ?? message?.id?.toString?.(),
        messageType: payload?.message_type ?? message?.message_type,
        conversationId:
          payload?.conversation?.id?.toString?.() ??
          payload?.conversation_id?.toString?.() ??
          message?.conversation_id?.toString?.(),
        inboxId:
          payload?.inbox?.id?.toString?.() ??
          payload?.inbox_id?.toString?.() ??
          payload?.conversation?.inbox_id?.toString?.() ??
          message?.inbox_id?.toString?.(),
        accountId:
          payload?.account?.id?.toString?.() ??
          payload?.account_id?.toString?.() ??
          payload?.conversation?.account_id?.toString?.() ??
          message?.account_id?.toString?.(),
        resolvedConnectionKey: resolvedContext?.connectionKey ?? null,
      }));
    }

    const expectedSecret = resolvedContext?.chatwoot.webhookSecret;
    if (expectedSecret) {
      if (!signatureHeader || !timestampHeader) {
        this.logger.warn(JSON.stringify({
          flow: 'chatwoot_to_evolution',
          stage: 'signature_missing',
          event: payload?.event ?? null,
          messageId: payload?.id?.toString?.() ?? message?.id?.toString?.() ?? null,
          hasSignature: Boolean(signatureHeader),
          hasTimestamp: Boolean(timestampHeader),
        }));
        throw new UnauthorizedException('Missing Chatwoot webhook signature headers');
      }

      const rawBodyBuffer = req?.rawBody as Buffer | undefined;
      if (!rawBodyBuffer) {
        this.logger.warn(JSON.stringify({
          flow: 'chatwoot_to_evolution',
          stage: 'signature_raw_body_missing',
          event: payload?.event ?? null,
          messageId: payload?.id?.toString?.() ?? message?.id?.toString?.() ?? null,
        }));
        throw new UnauthorizedException('Missing raw body for Chatwoot signature validation');
      }

      if (!this.isTimestampFresh(timestampHeader, resolvedContext?.chatwoot.webhookMaxSkewSeconds ?? 300)) {
        this.logger.warn(JSON.stringify({
          flow: 'chatwoot_to_evolution',
          stage: 'timestamp_invalid',
          event: payload?.event ?? null,
          messageId: payload?.id?.toString?.() ?? message?.id?.toString?.() ?? null,
          timestamp: timestampHeader,
          maxSkewSeconds: resolvedContext?.chatwoot.webhookMaxSkewSeconds ?? 300,
        }));
        throw new UnauthorizedException('Stale Chatwoot webhook timestamp');
      }

      const expectedSignature = this.computeSignature(expectedSecret, timestampHeader, rawBodyBuffer.toString('utf8'));
      if (!this.safeCompare(expectedSignature, signatureHeader)) {
        this.logger.warn(JSON.stringify({
          flow: 'chatwoot_to_evolution',
          stage: 'signature_mismatch',
          event: payload?.event ?? null,
          messageId: payload?.id?.toString?.() ?? message?.id?.toString?.() ?? null,
          signaturePrefix: String(signatureHeader).slice(0, 12),
          expectedPrefix: String(expectedSignature).slice(0, 12),
        }));
        throw new UnauthorizedException('Invalid Chatwoot webhook signature');
      }

      this.logger.log(JSON.stringify({
        flow: 'chatwoot_to_evolution',
        stage: 'signature_validated',
        event: payload?.event ?? null,
        messageId: payload?.id?.toString?.() ?? message?.id?.toString?.() ?? null,
      }));
    }

    switch (payload?.event) {
      case 'message_created':
        try {
          this.logger.log(JSON.stringify({
            flow: 'chatwoot_to_evolution',
            stage: 'handoff_start',
            event: payload?.event,
            messageId: payload?.id?.toString?.() ?? message?.id?.toString?.() ?? null,
            messageType: payload?.message_type ?? message?.message_type ?? null,
            conversationId:
              payload?.conversation?.id?.toString?.() ??
              payload?.conversation_id?.toString?.() ??
              message?.conversation_id?.toString?.() ??
              null,
            hasContent: Boolean(
              String(
                payload?.content ??
                message?.content ??
                payload?.content_attributes?.message ??
                message?.content_attributes?.message ??
                ''
              ).trim()
            ),
            hasAttachments: Boolean(
              (Array.isArray(payload?.attachments) && payload.attachments.length > 0) ||
              (Array.isArray(message?.attachments) && message.attachments.length > 0)
            ),
          }));
          await this.processOutgoingMessage.execute(payload, { connection: resolvedContext ?? undefined });
          this.logger.log(JSON.stringify({
            flow: 'chatwoot_to_evolution',
            stage: 'handoff_complete',
            event: payload?.event,
            messageId: payload?.id?.toString?.() ?? message?.id?.toString?.() ?? null,
            messageType: payload?.message_type ?? message?.message_type ?? null,
          }));
        } catch (error: any) {
          this.logger.error(JSON.stringify({
            flow: 'chatwoot_to_evolution',
            stage: 'processing_failed',
            event: payload?.event,
            messageId: payload?.id?.toString?.() ?? message?.id?.toString?.() ?? null,
            error: error?.message ?? 'unknown_error',
          }));
          throw error;
        }
        break;
      case 'contact_updated':
        this.logger.log(`Sincronizacao pendente: Contato atualizado no Chatwoot (ID: ${payload?.id})`);
        if (payload?.id && payload?.name) {
          const link = await this.prisma.conversationLink.findFirst({
            where: {
              chatwootContactId: payload.id.toString(),
              ...(resolvedContext ? { connectionKey: resolvedContext.connectionKey } : {}),
            }
          });
          if (link) {
            const existingContact = await this.prisma.companyContact.findFirst({
              where: { whatsapp: link.whatsappNumber }
            });
            if (existingContact) {
              await this.prisma.companyContact.update({
                where: { id: existingContact.id },
                data: { name: payload.name }
              });
              this.logger.log(`Contato ${link.whatsappNumber} atualizado no banco via Chatwoot: ${payload.name}`);
            }
          }
        }
        break;
      case 'contact_created':
        if (payload?.phone_number && payload?.name) {
          const phone = payload.phone_number.replace(/\D/g, '');
          const exists = await this.prisma.companyContact.findFirst({ where: { whatsapp: phone } });
          if (!exists) {
            await this.prisma.companyContact.create({
              data: { name: payload.name, whatsapp: phone }
            });
            this.logger.log(`Contato ${phone} sincronizado (criado manualmente no Chatwoot)`);
          }
        }
        break;
      case 'conversation_status_changed':
        this.logger.debug('Evento conversation_status_changed recebido; nenhuma acao remota no WhatsApp configurada.');
        break;
      case 'conversation_updated':
        this.logger.debug('Evento conversation_updated recebido; nenhuma acao remota no WhatsApp configurada.');
        break;
      case 'message_updated':
        this.logger.debug('Evento message_updated ignorado: exclusao remota no WhatsApp via endpoint legado removida.');
        break;
      default:
        this.logger.debug(`Evento Chatwoot nao processado/ignorado: ${payload?.event}`);
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

  private isTimestampFresh(timestamp: string, maxSkewSeconds: number): boolean {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const value = Number(timestamp);
    if (!Number.isFinite(value)) {
      this.logger.warn(`Chatwoot timestamp invalido: ${timestamp}`);
      return false;
    }

    return Math.abs(nowSeconds - value) <= maxSkewSeconds;
  }
}
