import { prisma } from "@/lib/prisma";
import {
  getDefaultZammadGlobalSettings,
  ZAMMAD_GLOBAL_SETTINGS_KEY,
  zammadGlobalSettingsSchema,
  type ZammadGlobalSettings,
} from "@/features/tickets/application/zammad-global-settings";

export async function getZammadGlobalSettingsSnapshot(): Promise<ZammadGlobalSettings> {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: ZAMMAD_GLOBAL_SETTINGS_KEY },
      select: { value: true },
    });

    if (!setting?.value) {
      return getDefaultZammadGlobalSettings();
    }

    const parsed = JSON.parse(setting.value);
    const validation = zammadGlobalSettingsSchema.safeParse(parsed);
    if (!validation.success) {
      return getDefaultZammadGlobalSettings();
    }

    return validation.data;
  } catch {
    return getDefaultZammadGlobalSettings();
  }
}

