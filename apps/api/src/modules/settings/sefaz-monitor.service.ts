import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import type { SefazServiceType, SefazStatusType } from '@prisma/client';
import {
  buildDefaultSefazRoutes,
  sefazRoutesSchema,
  SETTING_KEYS,
} from '@dosc-syspro/contracts';
import { PrismaService } from '../../prisma/prisma.service';

type SefazCheckResult = {
  uf: string;
  service: SefazServiceType;
  status: SefazStatusType;
  latency: number;
  statusCode: number | null;
  errorMessage: string | null;
  checkedAt: Date;
};

const SEFAZ_MONITOR_INTERVAL_MINUTES = Math.max(1, Number(process.env.SEFAZ_MONITOR_INTERVAL_MINUTES ?? 5));
const SEFAZ_MONITOR_RETENTION_HOURS = Math.max(1, Number(process.env.SEFAZ_MONITOR_RETENTION_HOURS ?? 24));
const SEFAZ_MONITOR_TIMEOUT_MS = Math.max(1000, Number(process.env.SEFAZ_MONITOR_TIMEOUT_MS ?? 8000));
const SEFAZ_MONITOR_ENABLED = process.env.SEFAZ_MONITOR_ENABLED !== 'false';
const SEFAZ_HISTORY_LATENCY_DELTA_MS = Math.max(100, Number(process.env.SEFAZ_HISTORY_LATENCY_DELTA_MS ?? 500));

function normalizeErrorMessage(value: unknown) {
  const message = typeof value === 'string' ? value : value instanceof Error ? value.message : 'sefaz_monitor_error';
  return message.trim().slice(0, 240) || 'sefaz_monitor_error';
}

function normalizeProbeUrl(rawUrl: string) {
  const trimmed = rawUrl.trim();
  if (!trimmed) return trimmed;
  if (trimmed.includes('?')) return trimmed;
  if (/\.asmx$/i.test(trimmed)) return `${trimmed}?wsdl`;
  return trimmed;
}

function classifySefazResponse(latency: number, statusCode: number, body: string): SefazStatusType {
  const normalizedBody = body.toLowerCase();
  const hasWsdlHint =
    normalizedBody.includes('definitions') ||
    normalizedBody.includes('wsdl:definitions') ||
    normalizedBody.includes('soap:address') ||
    normalizedBody.includes('wsdl:service');
  const hasSoapFault = normalizedBody.includes('faultcode') || normalizedBody.includes('soap:fault');

  if (statusCode >= 500) return 'OFFLINE';
  if (statusCode >= 400 && statusCode !== 405) return 'OFFLINE';
  if (statusCode === 405) return 'ONLINE';
  if (statusCode >= 300) return 'UNSTABLE';
  if (!hasWsdlHint && !hasSoapFault && latency > 2500) return 'UNSTABLE';
  if (latency > 2500) return 'UNSTABLE';
  return 'ONLINE';
}

function changedMeaningfully(previous: {
  status: SefazStatusType;
  statusCode: number | null;
  errorMessage: string | null;
  latency: number;
} | null, current: SefazCheckResult) {
  if (!previous) return true;
  if (previous.status !== current.status) return true;
  if ((previous.statusCode ?? null) !== (current.statusCode ?? null)) return true;
  if ((previous.errorMessage ?? null) !== (current.errorMessage ?? null)) return true;
  if (Math.abs(previous.latency - current.latency) >= SEFAZ_HISTORY_LATENCY_DELTA_MS) return true;
  return false;
}

@Injectable()
export class SettingsSefazMonitorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SettingsSefazMonitorService.name);
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    if (!SEFAZ_MONITOR_ENABLED) {
      this.logger.log('Monitor SEFAZ desabilitado por configuracao.');
      return;
    }

    this.logger.log(
      `Monitor SEFAZ habilitado. Intervalo=${SEFAZ_MONITOR_INTERVAL_MINUTES}min Retencao=${SEFAZ_MONITOR_RETENTION_HOURS}h Timeout=${SEFAZ_MONITOR_TIMEOUT_MS}ms`,
    );

    this.timer = setInterval(() => {
      void this.runScheduledCheck();
    }, SEFAZ_MONITOR_INTERVAL_MINUTES * 60 * 1000);

    void this.runScheduledCheck();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async getConfiguredRoutes() {
    const setting = await this.prisma.systemSetting.findUnique({
      where: { key: SETTING_KEYS.SEFAZ_ROUTES },
      select: { value: true },
    });

    if (!setting?.value) {
      return buildDefaultSefazRoutes();
    }

    try {
      const parsed = JSON.parse(setting.value);
      const validation = sefazRoutesSchema.safeParse(parsed);
      if (!validation.success) {
        return buildDefaultSefazRoutes();
      }

      return validation.data;
    } catch {
      return buildDefaultSefazRoutes();
    }
  }

  async runFullCheck() {
    const endpoints = (await this.getConfiguredRoutes()).filter((route) => route.active);

    const results = await Promise.all(
      endpoints.map(async (endpoint) => {
        const checkedAt = new Date();
        const start = Date.now();
        const probeUrl = normalizeProbeUrl(endpoint.url);

        try {
          const response = await fetch(probeUrl, {
            method: 'GET',
            headers: {
              Accept: 'application/wsdl+xml, text/xml, application/xml, text/html;q=0.8, */*;q=0.5',
            },
            signal: AbortSignal.timeout(SEFAZ_MONITOR_TIMEOUT_MS),
          });

          const body = await response.text().catch(() => '');
          const latency = Date.now() - start;
          const status = classifySefazResponse(latency, response.status, body);

          return {
            uf: endpoint.uf,
            service: endpoint.service,
            status,
            latency,
            statusCode: response.status,
            errorMessage: status === 'OFFLINE' ? `http_${response.status}` : null,
            checkedAt,
          } satisfies SefazCheckResult;
        } catch (error) {
          return {
            uf: endpoint.uf,
            service: endpoint.service,
            status: 'OFFLINE',
            latency: 0,
            statusCode: null,
            errorMessage: normalizeErrorMessage(error),
            checkedAt,
          } satisfies SefazCheckResult;
        }
      }),
    );

    let changedCount = 0;

    await this.prisma.$transaction(async (tx) => {
      for (const result of results) {
        const existing = await tx.sefazStatusCurrent.findUnique({
          where: {
            uf_service: {
              uf: result.uf,
              service: result.service,
            },
          },
        });

        const hasMeaningfulChange = changedMeaningfully(existing, result);
        const changedAt = hasMeaningfulChange ? result.checkedAt : existing?.changedAt ?? result.checkedAt;

        await tx.sefazStatusCurrent.upsert({
          where: {
            uf_service: {
              uf: result.uf,
              service: result.service,
            },
          },
          update: {
            status: result.status,
            latency: result.latency,
            statusCode: result.statusCode,
            errorMessage: result.errorMessage,
            checkedAt: result.checkedAt,
            changedAt,
          },
          create: {
            uf: result.uf,
            service: result.service,
            status: result.status,
            latency: result.latency,
            statusCode: result.statusCode,
            errorMessage: result.errorMessage,
            checkedAt: result.checkedAt,
            changedAt,
          },
        });

        if (hasMeaningfulChange) {
          changedCount += 1;
          await tx.sefazStatus.create({
            data: {
              uf: result.uf,
              service: result.service,
              status: result.status,
              latency: result.latency,
              statusCode: result.statusCode,
              errorMessage: result.errorMessage,
              checkedAt: result.checkedAt,
            },
          });
        }
      }

      const retentionStart = new Date(Date.now() - SEFAZ_MONITOR_RETENTION_HOURS * 60 * 60 * 1000);
      await tx.sefazStatus.deleteMany({
        where: {
          checkedAt: { lt: retentionStart },
        },
      });
    });

    return { count: results.length, changedCount };
  }

  private async runScheduledCheck() {
    if (this.running) {
      this.logger.warn('Monitor SEFAZ ainda em execucao; ciclo atual ignorado.');
      return;
    }

    this.running = true;

    try {
      const result = await this.runFullCheck();
      this.logger.log(`Monitor SEFAZ concluido. Rotas=${result.count} Alteracoes=${result.changedCount}`);
    } catch (error) {
      this.logger.error(`Falha no monitor SEFAZ: ${normalizeErrorMessage(error)}`);
    } finally {
      this.running = false;
    }
  }
}
