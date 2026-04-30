import { Injectable, Logger, OnModuleDestroy, OnModuleInit, Inject, forwardRef } from '@nestjs/common';
import type { Prisma, SefazServiceType, SefazStatusType } from '@prisma/client';
import { buildDefaultSefazRoutes } from '@dosc-syspro/contracts/sefaz-endpoints';
import { sefazRoutesSchema } from '@dosc-syspro/contracts/sefaz-routes';
import { SETTING_KEYS } from '@dosc-syspro/contracts/settings';
import { PrismaService } from '../../prisma/prisma.service';
import { AutomationWhatsappService } from '../automation/automation-whatsapp.service';
import * as https from 'https';

type SefazCheckResult = {
  uf: string;
  service: SefazServiceType;
  status: SefazStatusType;
  latency: number;
  statusCode: number | null;
  errorMessage: string | null;
  checkedAt: Date;
};

type SefazOutageWindowState = {
  active: boolean;
  openedAt: string | null;
  lastFailureAt: string | null;
  lastRecoveryAt: string | null;
  lastStatus: SefazStatusType | null;
};

type SefazOutageNotification = {
  uf: string;
  service: SefazServiceType;
  notificationType: 'down' | 'recovered';
  openedAt?: string | null;
  recoveredAt?: string | null;
};

const SEFAZ_MONITOR_NORMAL_INTERVAL_MINUTES = Math.max(
  1,
  Number(process.env.SEFAZ_MONITOR_NORMAL_INTERVAL_MINUTES ?? process.env.SEFAZ_MONITOR_INTERVAL_MINUTES ?? 5),
);
const SEFAZ_MONITOR_DEGRADED_INTERVAL_MINUTES = Math.max(
  1,
  Number(process.env.SEFAZ_MONITOR_DEGRADED_INTERVAL_MINUTES ?? 2),
);
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

function changedMeaningfully(
  previous: {
    status: SefazStatusType;
    statusCode: number | null;
    errorMessage: string | null;
    latency: number;
  } | null,
  current: SefazCheckResult,
) {
  if (!previous) return true;
  if (previous.status !== current.status) return true;
  if ((previous.statusCode ?? null) !== (current.statusCode ?? null)) return true;
  if ((previous.errorMessage ?? null) !== (current.errorMessage ?? null)) return true;
  if (Math.abs(previous.latency - current.latency) >= SEFAZ_HISTORY_LATENCY_DELTA_MS) return true;
  return false;
}

function buildOutageWindowKey(uf: string, service: SefazServiceType) {
  return `sefaz.outage.window.${uf}.${service}`;
}

function parseOutageWindowState(rawValue?: string | null): SefazOutageWindowState {
  if (!rawValue) {
    return {
      active: false,
      openedAt: null,
      lastFailureAt: null,
      lastRecoveryAt: null,
      lastStatus: null,
    };
  }

  try {
    const parsed = JSON.parse(rawValue) as Partial<SefazOutageWindowState>;
    return {
      active: parsed.active === true,
      openedAt: typeof parsed.openedAt === 'string' ? parsed.openedAt : null,
      lastFailureAt: typeof parsed.lastFailureAt === 'string' ? parsed.lastFailureAt : null,
      lastRecoveryAt: typeof parsed.lastRecoveryAt === 'string' ? parsed.lastRecoveryAt : null,
      lastStatus:
        parsed.lastStatus === 'ONLINE' || parsed.lastStatus === 'UNSTABLE' || parsed.lastStatus === 'OFFLINE'
          ? parsed.lastStatus
          : null,
    };
  } catch {
    return {
      active: false,
      openedAt: null,
      lastFailureAt: null,
      lastRecoveryAt: null,
      lastStatus: null,
    };
  }
}

@Injectable()
export class SettingsSefazMonitorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SettingsSefazMonitorService.name);
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => AutomationWhatsappService))
    private readonly automationWhatsappService: AutomationWhatsappService,
  ) {}

  onModuleInit() {
    if (!SEFAZ_MONITOR_ENABLED) {
      this.logger.log('Monitor SEFAZ desabilitado por configuracao.');
      return;
    }

    this.logger.log(
      `Monitor SEFAZ habilitado. IntervaloNormal=${SEFAZ_MONITOR_NORMAL_INTERVAL_MINUTES}min IntervaloFalha=${SEFAZ_MONITOR_DEGRADED_INTERVAL_MINUTES}min Retencao=${SEFAZ_MONITOR_RETENTION_HOURS}h Timeout=${SEFAZ_MONITOR_TIMEOUT_MS}ms`,
    );

    void this.runScheduledCheck();
  }

  onModuleDestroy() {
    if (this.timer) clearTimeout(this.timer);
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
          const response = await new Promise<{ status: number; body: string }>((resolve, reject) => {
            const req = https.request(
              probeUrl,
              {
                method: 'GET',
                rejectUnauthorized: false,
                timeout: SEFAZ_MONITOR_TIMEOUT_MS,
                headers: {
                  Accept: 'application/wsdl+xml, text/xml, application/xml, text/html;q=0.8, */*;q=0.5',
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                },
              },
              (res) => {
                let responseBody = '';
                res.on('data', (chunk) => (responseBody += chunk));
                res.on('end', () => resolve({ status: res.statusCode || 500, body: responseBody }));
              },
            );

            req.on('error', reject);
            req.on('timeout', () => {
              req.destroy();
              reject(new Error('timeout'));
            });
            req.end();
          });

          const body = response.body;
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
          const errMessage = normalizeErrorMessage(error);
          const isSslHandshakeFailure =
            errMessage.includes('handshake failure') || errMessage.includes('SSL alert number 40');
          const status = isSslHandshakeFailure ? 'ONLINE' : 'OFFLINE';

          return {
            uf: endpoint.uf,
            service: endpoint.service,
            status,
            latency: isSslHandshakeFailure ? 100 : 0,
            statusCode: null,
            errorMessage: errMessage,
            checkedAt,
          } satisfies SefazCheckResult;
        }
      }),
    );

    let changedCount = 0;
    const notifications: SefazOutageNotification[] = [];

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

        const outageWindow = await this.syncOutageWindow(tx, result);
        if (outageWindow) {
          notifications.push(outageWindow);
        }
      }

      const retentionStart = new Date(Date.now() - SEFAZ_MONITOR_RETENTION_HOURS * 60 * 60 * 1000);
      await tx.sefazStatus.deleteMany({
        where: {
          checkedAt: { lt: retentionStart },
        },
      });
    });

    const groupedNotifications = notifications.reduce<Record<'down' | 'recovered', SefazOutageNotification[]>>(
      (accumulator, notification) => {
        accumulator[notification.notificationType].push(notification);
        return accumulator;
      },
      { down: [], recovered: [] },
    );

    for (const notificationType of ['down', 'recovered'] as const) {
      const batch = groupedNotifications[notificationType];
      if (!batch.length) continue;

      try {
        await this.automationWhatsappService.sendSefazRouteStatusDigestNotification({
          notificationType,
          routes: batch.map((notification) => ({
            uf: notification.uf,
            service: notification.service,
            openedAt: notification.openedAt,
            recoveredAt: notification.recoveredAt,
          })),
        });
      } catch (error) {
        this.logger.warn(
          JSON.stringify({
            stage: 'sefaz_notification_dispatch_failed',
            notificationType,
            routeCount: batch.length,
            error: normalizeErrorMessage(error),
          }),
        );
      }
    }

    return {
      count: results.length,
      changedCount,
      hasFailures: results.some((result) => result.status !== 'ONLINE'),
      notificationsCount: notifications.length,
    };
  }

  private async syncOutageWindow(
    tx: Prisma.TransactionClient,
    result: SefazCheckResult,
  ): Promise<SefazOutageNotification | null> {
    const key = buildOutageWindowKey(result.uf, result.service);
    const existingSetting = await tx.systemSetting.findUnique({
      where: { key },
      select: { value: true },
    });

    const previous = parseOutageWindowState(existingSetting?.value);
    const checkedAtIso = result.checkedAt.toISOString();
    let next: SefazOutageWindowState = {
      ...previous,
      lastStatus: result.status,
    };
    let notification: SefazOutageNotification | null = null;

    if (!previous.active && result.status === 'OFFLINE') {
      next = {
        active: true,
        openedAt: checkedAtIso,
        lastFailureAt: checkedAtIso,
        lastRecoveryAt: previous.lastRecoveryAt,
        lastStatus: result.status,
      };
      notification = {
        uf: result.uf,
        service: result.service,
        notificationType: 'down',
        openedAt: next.openedAt,
      };
    } else if (previous.active && result.status === 'ONLINE') {
      next = {
        active: false,
        openedAt: previous.openedAt,
        lastFailureAt: previous.lastFailureAt,
        lastRecoveryAt: checkedAtIso,
        lastStatus: result.status,
      };
      notification = {
        uf: result.uf,
        service: result.service,
        notificationType: 'recovered',
        openedAt: previous.openedAt,
        recoveredAt: checkedAtIso,
      };
    } else if (previous.active) {
      next = {
        active: true,
        openedAt: previous.openedAt ?? checkedAtIso,
        lastFailureAt: result.status === 'OFFLINE' ? checkedAtIso : previous.lastFailureAt,
        lastRecoveryAt: previous.lastRecoveryAt,
        lastStatus: result.status,
      };
    }

    if (JSON.stringify(previous) !== JSON.stringify(next)) {
      await tx.systemSetting.upsert({
        where: { key },
        update: {
          value: JSON.stringify(next),
          description: `Janela de indisponibilidade SEFAZ para ${result.uf}/${result.service}`,
        },
        create: {
          key,
          value: JSON.stringify(next),
          description: `Janela de indisponibilidade SEFAZ para ${result.uf}/${result.service}`,
        },
      });
    }

    return notification;
  }

  private scheduleNextRun(intervalMinutes: number) {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      void this.runScheduledCheck();
    }, intervalMinutes * 60 * 1000);
  }

  private async runScheduledCheck() {
    if (this.running) {
      this.logger.warn('Monitor SEFAZ ainda em execucao; ciclo atual ignorado.');
      this.scheduleNextRun(SEFAZ_MONITOR_DEGRADED_INTERVAL_MINUTES);
      return;
    }

    this.running = true;
    let nextIntervalMinutes = SEFAZ_MONITOR_NORMAL_INTERVAL_MINUTES;

    try {
      const result = await this.runFullCheck();
      nextIntervalMinutes = result.hasFailures
        ? SEFAZ_MONITOR_DEGRADED_INTERVAL_MINUTES
        : SEFAZ_MONITOR_NORMAL_INTERVAL_MINUTES;
      this.logger.log(
        `Monitor SEFAZ concluido. Rotas=${result.count} Alteracoes=${result.changedCount} Notificacoes=${result.notificationsCount} ProximoCiclo=${nextIntervalMinutes}min`,
      );
    } catch (error) {
      nextIntervalMinutes = SEFAZ_MONITOR_DEGRADED_INTERVAL_MINUTES;
      this.logger.error(`Falha no monitor SEFAZ: ${normalizeErrorMessage(error)}`);
    } finally {
      this.running = false;
      this.scheduleNextRun(nextIntervalMinutes);
    }
  }
}
