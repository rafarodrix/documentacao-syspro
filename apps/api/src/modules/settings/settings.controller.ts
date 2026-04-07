import { Controller, Get, Put, Body, Param } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  DEFAULT_EVOLUTION_SETTINGS,
  evolutionSettingsSchema,
  type EvolutionSettingsInput,
} from '@dosc-syspro/contracts';

@Controller('settings')
export class SettingsController {
  private static readonly EVOLUTION_CONFIG_KEY = 'evolution_config';
  private static readonly LEGACY_EVOLUTION_CONFIG_KEY = 'whatsapp_evolution_config';

  constructor(private readonly prisma: PrismaService) {}

  @Get('evolution')
  async getEvolutionSettings() {
    const setting = await this.prisma.systemSetting.findUnique({
      where: { key: SettingsController.EVOLUTION_CONFIG_KEY },
    });

    const fallbackLegacySetting = !setting?.value
      ? await this.prisma.systemSetting.findUnique({
          where: { key: SettingsController.LEGACY_EVOLUTION_CONFIG_KEY },
        })
      : null;
    const sourceValue = setting?.value ?? fallbackLegacySetting?.value;

    if (!sourceValue) {
      return { success: true, settings: DEFAULT_EVOLUTION_SETTINGS };
    }

    try {
      const parsed = JSON.parse(sourceValue);
      const validation = evolutionSettingsSchema.safeParse(parsed);
      if (!validation.success) {
        return { success: true, settings: DEFAULT_EVOLUTION_SETTINGS };
      }
      return { success: true, settings: validation.data };
    } catch {
      return { success: true, settings: DEFAULT_EVOLUTION_SETTINGS };
    }
  }

  @Put('evolution')
  async setEvolutionSettings(@Body() input: EvolutionSettingsInput) {
    const parsed = evolutionSettingsSchema.parse(input);
    const setting = await this.prisma.systemSetting.upsert({
      where: { key: SettingsController.EVOLUTION_CONFIG_KEY },
      update: { value: JSON.stringify(parsed) },
      create: {
        key: SettingsController.EVOLUTION_CONFIG_KEY,
        value: JSON.stringify(parsed),
        description: 'Configuracao global Evolution',
      },
    });

    return {
      success: true,
      settings: parsed,
      updatedAt: setting.updatedAt,
    };
  }

  @Get(':key')
  async getSetting(@Param('key') key: string) {
    const setting = await this.prisma.systemSetting.findUnique({ where: { key } });
    return { value: setting?.value || '' };
  }

  @Put(':key')
  async setSetting(@Param('key') key: string, @Body('value') value: string) {
    const setting = await this.prisma.systemSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value, description: 'Configuração Global' },
    });
    return { success: true, value: setting.value };
  }
}
