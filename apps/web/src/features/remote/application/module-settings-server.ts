import { prisma } from "@/lib/prisma";
import {
  getDefaultRemoteModuleSettings,
  REMOTE_MODULE_SETTINGS_KEY,
  remoteModuleSettingsSchema,
} from "@/features/remote/application/module-settings";
import type { RemoteModuleSettings } from "@/features/remote/domain/model";

export async function getRemoteModuleSettingsSnapshot(): Promise<RemoteModuleSettings> {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: REMOTE_MODULE_SETTINGS_KEY },
      select: { value: true },
    });

    if (!setting?.value) {
      return getDefaultRemoteModuleSettings();
    }

    const parsed = JSON.parse(setting.value);
    const validation = remoteModuleSettingsSchema.safeParse(parsed);
    if (!validation.success) {
      return getDefaultRemoteModuleSettings();
    }

    return validation.data;
  } catch {
    return getDefaultRemoteModuleSettings();
  }
}
