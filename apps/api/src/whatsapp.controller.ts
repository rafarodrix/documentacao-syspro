import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { evolutionWebhookEnvelopeSchema } from '@dosc-syspro/contracts';

@Controller('webhooks/evolution')
export class WhatsAppController {
  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  async handleEvolutionWebhook(@Body() body: unknown) {
    const parsed = evolutionWebhookEnvelopeSchema.safeParse(body);
    if (!parsed.success) {
      return { success: false, status: 'ignored_event' as const };
    }

    // Endpoint de transicao para backend dedicado.
    // A orquestracao completa ainda permanece no apps/web ate o corte final.
    return {
      success: true,
      status: 'accepted_not_wired',
      event: parsed.data.event,
    };
  }
}
