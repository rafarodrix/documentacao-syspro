import { Injectable } from '@nestjs/common';
import {
  DEFAULT_TASK_MODULE_SETTINGS,
  taskModuleSettingsSchema,
  type TaskModuleSettings,
} from '@dosc-syspro/contracts/tarefas';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TarefasSettingsService {
  static readonly SETTINGS_KEY = 'tarefas.module.settings';

  constructor(private readonly prisma: PrismaService) {}

  async readModuleSettings(): Promise<TaskModuleSettings> {
    try {
      const record = await this.prisma.systemSetting.findUnique({
        where: { key: TarefasSettingsService.SETTINGS_KEY },
        select: { value: true },
      });

      if (record?.value) {
        const parsed = taskModuleSettingsSchema.safeParse(JSON.parse(record.value));
        if (parsed.success) return parsed.data;
      }
    } catch {
      // fall back to defaults
    }

    return DEFAULT_TASK_MODULE_SETTINGS;
  }
}
