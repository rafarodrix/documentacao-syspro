import { BadRequestException, Injectable } from '@nestjs/common';
import { EvolutionClient } from './evolution.client';
import { IntegrationContextService } from '../../settings/integration-context.service';

type DispatchContext = {
  connectionKey: string;
  evolution: Parameters<EvolutionClient['sendTextMessage']>[0];
};

export type OperationalWhatsappDispatchInput<TRecord> = {
  companyId: string;
  targetPhone: string;
  message: string;
  getNextAttemptNumber: () => Promise<number>;
  persistSent: (input: {
    attemptNumber: number;
    occurredAt: Date;
    providerMessageId: string | null;
    providerConnectionKey: string;
  }) => Promise<TRecord>;
  persistFailed: (input: {
    attemptNumber: number;
    occurredAt: Date;
    providerConnectionKey: string;
    errorMessage: string;
  }) => Promise<void>;
};

@Injectable()
export class OperationalWhatsappDispatchService {
  constructor(
    private readonly evolutionClient: EvolutionClient,
    private readonly integrationContext: IntegrationContextService,
  ) {}

  async sendAndRecord<TRecord>(input: OperationalWhatsappDispatchInput<TRecord>) {
    const context = await this.resolveCompanyContext(input.companyId);
    const attemptNumber = await input.getNextAttemptNumber();

    let sendResult: { messageId?: string };
    try {
      sendResult = await this.evolutionClient.sendTextMessage(
        context.evolution,
        input.targetPhone,
        input.message,
      );
    } catch (error) {
      const occurredAt = new Date();
      await input.persistFailed({
        attemptNumber,
        occurredAt,
        providerConnectionKey: context.connectionKey,
        errorMessage: error instanceof Error ? error.message : 'Falha ao enviar solicitacao manual.',
      });
      throw error;
    }

    const occurredAt = new Date();
    const record = await input.persistSent({
      attemptNumber,
      occurredAt,
      providerMessageId: sendResult.messageId ?? null,
      providerConnectionKey: context.connectionKey,
    });

    return { attemptNumber, occurredAt, record };
  }

  private async resolveCompanyContext(companyId: string): Promise<DispatchContext> {
    const contexts = await this.integrationContext.listActiveContexts({ companyIds: [companyId] });
    const context = contexts[0] ?? null;
    if (!context) {
      throw new BadRequestException('Nenhuma conexao Evolution ativa encontrada para realizar o disparo.');
    }

    return context;
  }
}
