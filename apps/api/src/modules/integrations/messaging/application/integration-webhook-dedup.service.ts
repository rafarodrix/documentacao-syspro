import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '../../../../prisma/prisma.service';

@Injectable()
export class IntegrationWebhookDedupService {
  private readonly logger = new Logger(IntegrationWebhookDedupService.name);
  private dedupTableUnavailableLogged = false;
  private readonly defaultTtlSeconds = (() => {
    const parsed = Number(process.env.INTEGRATION_WEBHOOK_DEDUP_TTL_SECONDS ?? '86400');
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 86400;
  })();

  constructor(private readonly prisma: PrismaService) {}

  async claim(provider: string, providerEventId: string, instanceId: string | null = null, ttlSeconds = this.defaultTtlSeconds): Promise<boolean> {
    const ttl = Number.isFinite(ttlSeconds) && ttlSeconds > 0 ? ttlSeconds : this.defaultTtlSeconds;
    const dedupId = createHash('sha256')
      .update(`${provider}:${providerEventId}`)
      .digest('hex');

    try {
      const rows = await this.prisma.$queryRawUnsafe<Array<{ id: string }>>(
        `
        INSERT INTO "integration_webhook_dedup" ("id", "provider", "providerEventId", "instanceId", "createdAt", "expiresAt")
        VALUES ($1, $2, $3, $4, NOW(), NOW() + ($5::int * INTERVAL '1 second'))
        ON CONFLICT ("provider", "providerEventId")
        DO UPDATE
          SET "instanceId" = EXCLUDED."instanceId",
              "createdAt" = EXCLUDED."createdAt",
              "expiresAt" = EXCLUDED."expiresAt"
        WHERE "integration_webhook_dedup"."expiresAt" <= NOW()
        RETURNING "id"
        `,
        dedupId,
        provider,
        providerEventId,
        instanceId,
        ttl
      );

      return Array.isArray(rows) && rows.length > 0;
    } catch (error: any) {
      const relationMissing =
        error?.code === 'P2010' &&
        (error?.meta?.code === '42P01' ||
          String(error?.meta?.message || '').toLowerCase().includes('does not exist'));

      const columnMissing =
        error?.code === 'P2010' &&
        (error?.meta?.code === '42703' ||
          String(error?.meta?.message || '').toLowerCase().includes('column') &&
          String(error?.meta?.message || '').toLowerCase().includes('does not exist'));

      if (relationMissing || columnMissing) {
        if (!this.dedupTableUnavailableLogged) {
          this.logger.warn(
            'Tabela/colunas de deduplicacao ausentes. Deduplicacao em banco desabilitada ate aplicar migracoes.'
          );
          this.dedupTableUnavailableLogged = true;
        }
        return true;
      }

      throw error;
    }
  }
}
