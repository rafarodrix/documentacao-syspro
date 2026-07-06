import { Injectable } from '@nestjs/common';
import {
  DEFAULT_EVOLUTION_SETTINGS,
  evolutionSettingsSchema,
  type EvolutionSettingsInput,
} from '@dosc-syspro/contracts/evolution';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SettingsEvolutionConfigService {
  private static readonly EVOLUTION_CONFIG_KEY = 'evolution_config';

  constructor(private readonly prisma: PrismaService) {}

  async upsertSettings(input: EvolutionSettingsInput) {
    const parsed = evolutionSettingsSchema.parse(input);
    const setting = await this.prisma.systemSetting.upsert({
      where: { key: SettingsEvolutionConfigService.EVOLUTION_CONFIG_KEY },
      update: { value: JSON.stringify(parsed) },
      create: {
        key: SettingsEvolutionConfigService.EVOLUTION_CONFIG_KEY,
        value: JSON.stringify(parsed),
        description: 'Configuracao global Evolution',
      },
    });

    return {
      settings: parsed,
      updatedAt: setting.updatedAt,
    };
  }

  async readStoredSettings() {
    const setting = await this.prisma.systemSetting.findUnique({
      where: { key: SettingsEvolutionConfigService.EVOLUTION_CONFIG_KEY },
      select: { value: true },
    });

    if (!setting?.value) {
      return DEFAULT_EVOLUTION_SETTINGS;
    }

    try {
      const parsed = JSON.parse(setting.value);
      const validation = evolutionSettingsSchema.safeParse(parsed);
      return validation.success ? validation.data : DEFAULT_EVOLUTION_SETTINGS;
    } catch {
      return DEFAULT_EVOLUTION_SETTINGS;
    }
  }
}
