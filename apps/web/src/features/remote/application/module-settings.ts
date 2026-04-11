import {
  DEFAULT_REMOTE_MODULE_SETTINGS,
  remoteModuleSettingsSchema,
  REMOTE_MODULE_SETTINGS_KEY,
  type RemoteModuleSettings,
} from "@dosc-syspro/contracts";

export { REMOTE_MODULE_SETTINGS_KEY, remoteModuleSettingsSchema };
export type { RemoteModuleSettings };

export function getDefaultRemoteModuleSettings(): RemoteModuleSettings {
  return { ...DEFAULT_REMOTE_MODULE_SETTINGS };
}
