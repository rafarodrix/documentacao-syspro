import { prisma } from "@dosc-syspro/database";
import {
  DEFAULT_REMOTE_MODULE_SETTINGS,
  REMOTE_MODULE_SETTINGS_KEY,
  remoteModuleSettingsSchema,
  type RemoteModuleSettings,
} from "@dosc-syspro/contracts/remote";

export async function getRemoteModuleSettingsSnapshot(): Promise<RemoteModuleSettings> {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: REMOTE_MODULE_SETTINGS_KEY },
      select: { value: true },
    });

    if (!setting?.value) {
      return { ...DEFAULT_REMOTE_MODULE_SETTINGS };
    }

    const parsed = JSON.parse(setting.value);
    const validation = remoteModuleSettingsSchema.safeParse(parsed);
    if (!validation.success) {
      return { ...DEFAULT_REMOTE_MODULE_SETTINGS };
    }

    return validation.data;
  } catch {
    return { ...DEFAULT_REMOTE_MODULE_SETTINGS };
  }
}
