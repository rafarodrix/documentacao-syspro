import { Injectable } from '@nestjs/common';
import type { SefazServiceType, SefazStatusType } from '@prisma/client';
import {
  analyzeSefazResponse,
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
};

@Injectable()
export class SettingsSefazMonitorService {
  constructor(private readonly prisma: PrismaService) {}

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

    const results = await Promise.allSettled(
      endpoints.map(async (endpoint) => {
        const start = Date.now();

        try {
          const response = await fetch(endpoint.url, {
            method: 'GET',
            signal: AbortSignal.timeout(8000),
          });

          const latency = Date.now() - start;
          const status = analyzeSefazResponse(latency, response.status);

          return {
            uf: endpoint.uf,
            service: endpoint.service,
            status,
            latency,
          } satisfies SefazCheckResult;
        } catch {
          return {
            uf: endpoint.uf,
            service: endpoint.service,
            status: 'OFFLINE',
            latency: 0,
          } satisfies SefazCheckResult;
        }
      }),
    );

    const dataToSave = results
      .filter((result): result is PromiseFulfilledResult<SefazCheckResult> => result.status === 'fulfilled')
      .map((result) => result.value);

    if (dataToSave.length > 0) {
      await this.prisma.sefazStatus.createMany({
        data: dataToSave,
      });
    }

    return { count: dataToSave.length };
  }
}
