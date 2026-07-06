import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

type EvolutionStoredQrCode = {
  qrCode: string | null;
  code: string | null;
  receivedAt: string | null;
};

type EvolutionStoredStatus = {
  status: string;
  event: string | null;
  receivedAt: string | null;
  details: Record<string, unknown>;
};

@Injectable()
export class SettingsEvolutionStatusStoreService {
  private static readonly EVOLUTION_QRCODE_KEY_PREFIX = 'evolution_qrcode:';
  private static readonly EVOLUTION_STATUS_KEY_PREFIX = 'evolution_status:';

  constructor(private readonly prisma: PrismaService) {}

  async waitForStoredQrCode(instanceId: string, minReceivedAt: Date): Promise<EvolutionStoredQrCode> {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const stored = await this.readStoredQrCode(instanceId, minReceivedAt);
      if (stored?.qrCode || stored?.code) return stored;
      await this.sleep(750);
    }

    return { qrCode: null, code: null, receivedAt: null };
  }

  async upsertStoredStatus(input: {
    instanceId: string;
    event: string;
    status: string;
    details?: Record<string, unknown>;
  }) {
    const payload = {
      instanceId: input.instanceId,
      event: input.event,
      status: input.status,
      details: input.details ?? {},
      receivedAt: new Date().toISOString(),
    };

    await this.prisma.systemSetting.upsert({
      where: { key: `${SettingsEvolutionStatusStoreService.EVOLUTION_STATUS_KEY_PREFIX}${input.instanceId}` },
      update: { value: JSON.stringify(payload) },
      create: {
        key: `${SettingsEvolutionStatusStoreService.EVOLUTION_STATUS_KEY_PREFIX}${input.instanceId}`,
        value: JSON.stringify(payload),
        description: 'Ultimo status operacional recebido da Evolution Go',
      },
    });
  }

  async readStoredStatus(instanceId: string): Promise<EvolutionStoredStatus | null> {
    const row = await this.prisma.systemSetting.findUnique({
      where: { key: `${SettingsEvolutionStatusStoreService.EVOLUTION_STATUS_KEY_PREFIX}${instanceId}` },
      select: { value: true, updatedAt: true },
    });

    if (!row?.value) return null;

    try {
      const parsed = JSON.parse(row.value);
      return {
        status: this.readOptionalString(parsed?.status) ?? 'UNKNOWN',
        event: this.readOptionalString(parsed?.event),
        receivedAt: this.readOptionalString(parsed?.receivedAt) ?? row.updatedAt.toISOString(),
        details: parsed?.details && typeof parsed.details === 'object' ? parsed.details : {},
      };
    } catch {
      return null;
    }
  }

  private async readStoredQrCode(instanceId: string, minReceivedAt: Date): Promise<EvolutionStoredQrCode | null> {
    const row = await this.prisma.systemSetting.findUnique({
      where: { key: `${SettingsEvolutionStatusStoreService.EVOLUTION_QRCODE_KEY_PREFIX}${instanceId}` },
      select: { value: true, updatedAt: true },
    });

    if (!row?.value) return null;

    try {
      const parsed = JSON.parse(row.value);
      const receivedAt = this.readOptionalString(parsed?.receivedAt) ?? row.updatedAt.toISOString();
      if (new Date(receivedAt).getTime() < minReceivedAt.getTime()) {
        return null;
      }

      return {
        qrCode: this.readOptionalString(parsed?.qrCode),
        code: this.readOptionalString(parsed?.code),
        receivedAt,
      };
    } catch {
      return null;
    }
  }

  private readOptionalString(value: unknown): string | null {
    const normalized = String(value ?? '').trim();
    return normalized || null;
  }

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
