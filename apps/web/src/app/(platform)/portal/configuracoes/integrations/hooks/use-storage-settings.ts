import {
  DEFAULT_STORAGE_R2_SETTINGS,
  storageR2SettingsSchema,
} from "@dosc-syspro/contracts/settings";
import { usePlatformSettings } from "./use-platform-settings";

export function useStorageSettings() {
  const { data, isLoading, isSaving, setData, save } = usePlatformSettings({
    endpoint: "/api/platform/settings/storage-config",
    schema: storageR2SettingsSchema,
    defaultValue: DEFAULT_STORAGE_R2_SETTINGS,
    invalidMessage: "Configuracao de storage invalida.",
    saveErrorMessage: "Falha ao salvar configuracao de storage.",
    saveSuccessMessage: "Configuracao de storage salva.",
  });

  return {
    settings: data,
    isLoading,
    isSaving,
    setSettings: setData,
    save,
  };
}
