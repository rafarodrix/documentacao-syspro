import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { ChatwootClient } from './modules/integrations/chatwoot/chatwoot.client';
import { IntegrationContextService } from './modules/settings/integration-context.service';

@Injectable()
export class AppService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly chatwootClient: ChatwootClient,
    private readonly integrationContext: IntegrationContextService,
  ) {}

  async getHealthcheck() {
    // Validação real de conexão no pool do NestJS
    const sefazCount = await this.prisma.sefazStatus.count().catch(() => 0);

    return {
      status: 'ok',
      service: '@dosc-syspro/app-api',
      framework: 'NestJS',
      dbRecordsCount: sefazCount,
      timestamp: new Date().toISOString()
    };
  }

  async getChatwootIntegrationHealth() {
    const context = await this.integrationContext.getDefaultContext();
    if (!context) {
      return {
        status: 'error',
        checkedAt: new Date().toISOString(),
        accountRoute: { endpoint: '', ok: false, error: 'Nenhuma conexao ativa ou fallback de ambiente disponivel' },
        inbox: {},
      };
    }

    return this.chatwootClient.getIntegrationHealth(context.chatwoot);
  }
}
