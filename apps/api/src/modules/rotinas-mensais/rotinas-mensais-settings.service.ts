import { Injectable } from '@nestjs/common';
import {
  DEFAULT_MONTHLY_ROUTINE_MODULE_SETTINGS,
  monthlyRoutineModuleSettingsSchema,
  type MonthlyRoutineModuleSettings,
} from '@dosc-syspro/contracts/rotinas-mensais';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RotinasMensaisSettingsService {
  static readonly SETTINGS_KEY = 'monthly_routines.module.settings';

  constructor(private readonly prisma: PrismaService) {}

  async readModuleSettings(): Promise<MonthlyRoutineModuleSettings> {
    try {
      const record = await this.prisma.systemSetting.findUnique({
        where: { key: RotinasMensaisSettingsService.SETTINGS_KEY },
        select: { value: true },
      });

      if (record?.value) {
        const parsed = monthlyRoutineModuleSettingsSchema.safeParse(JSON.parse(record.value));
        if (parsed.success) return parsed.data;
      }
    } catch {
      // fall back to defaults
    }

    return DEFAULT_MONTHLY_ROUTINE_MODULE_SETTINGS;
  }
}
