import { BadRequestException, Body, Controller, Headers, Post } from '@nestjs/common';
import { assertInternalApiKey } from '../../../common/auth/internal-api-auth';
import { EvolutionClient } from './evolution.client';

type SendEvolutionMessageInput = {
  to?: string;
  text?: string;
};

@Controller('integrations/evolution/messages')
export class EvolutionMessagesController {
  constructor(private readonly evolutionClient: EvolutionClient) {}

  @Post('send')
  async send(
    @Headers('x-internal-api-key') internalApiKey: string | undefined,
    @Body() body: SendEvolutionMessageInput,
  ) {
    assertInternalApiKey(internalApiKey);

    const to = body?.to?.trim();
    const text = body?.text?.trim();
    if (!to) {
      throw new BadRequestException('Campo "to" é obrigatório.');
    }
    if (!text) {
      throw new BadRequestException('Campo "text" é obrigatório.');
    }

    const result = await this.evolutionClient.sendTextMessage(to, text);
    return { success: true, messageId: result.messageId };
  }
}
