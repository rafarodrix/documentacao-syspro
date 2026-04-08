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
import { EvolutionClient } from '../evolution/evolution.client';

@Controller('webhooks/chatwoot')
export class ChatwootWebhookController {
  private readonly logger = new Logger(ChatwootWebhookController.name);

  constructor(
    private readonly processOutgoingMessage: ProcessOutgoingMessageUseCase,
    private readonly prisma: PrismaService,
    private readonly evolutionClient: EvolutionClient
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
        // Se a conversa foi resolvida, mandamos mensagem de encerramento pro cliente
        if (payload?.status === 'resolved' && payload?.meta?.sender?.phone_number) {
          const phone = payload.meta.sender.phone_number.replace(/\D/g, '');
          const ticketId = payload.display_id || payload.id;
          const closeMessage = `Atendimento #${ticketId} encerrado. Agradecemos o seu contato!`;
          
          try {
            await this.evolutionClient.sendTextMessage(phone, closeMessage);
            this.logger.log(`Aviso de encerramento automático enviado para ${phone}`);
          } catch (err: any) {
            this.logger.error(`Falha ao enviar aviso de encerramento para ${phone}: ${err.message}`);
          }
        }
        break;
      case 'conversation_updated':
        // 3. Aviso de transferência de atendente
        // O Chatwoot emite changed_attributes apontando o que mudou no banco (comum em Ruby on Rails)
        const newAssigneeName = payload?.meta?.assignee?.name;
        const convPhone = payload?.meta?.sender?.phone_number;
        const isAssignmentChange = payload?.changed_attributes && Object.keys(payload.changed_attributes).includes('assignee_id');

        if (isAssignmentChange && newAssigneeName && convPhone && payload?.status === 'open') {
          const phoneStr = convPhone.replace(/\D/g, '');
          const transferMsg = `Você agora está falando com ${newAssigneeName}. Como posso ajudar?`;
          try {
            await this.evolutionClient.sendTextMessage(phoneStr, transferMsg);
            this.logger.log(`Aviso de transferência enviado para ${phoneStr} (${newAssigneeName})`);
          } catch (err: any) {
            this.logger.error(`Falha ao enviar aviso de transferência: ${err.message}`);
          }
        }
        break;
      case 'message_updated':
        // 4. Exclusão de mensagens (Apagar para todos)
        // O Chatwoot marca a mensagem como deletada inserindo content_attributes.deleted = true
        const isDeleted = payload?.content_attributes?.deleted === true;
        const chatwootMsgId = payload?.id?.toString();
        const contactPhone = payload?.conversation?.meta?.sender?.phone_number || payload?.sender?.phone_number;
        
        if (isDeleted && chatwootMsgId && contactPhone) {
          const phone = contactPhone.replace(/\D/g, '');
          try {
            const link = await (this.prisma as any).messageLink.findUnique({ where: { chatwootMessageId: chatwootMsgId } });
            if (link?.evolutionMessageId) {
              const success = await this.evolutionClient.deleteMessage(phone, link.evolutionMessageId);
              if (success) this.logger.log(`Mensagem ${chatwootMsgId} apagada no WhatsApp para o número ${phone}`);
            }
          } catch (err: any) {
            this.logger.error(`Falha ao apagar mensagem no WhatsApp (ou tabela MessageLink ausente): ${err.message}`);
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
