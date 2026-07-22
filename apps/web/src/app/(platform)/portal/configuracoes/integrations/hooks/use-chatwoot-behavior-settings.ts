import {
  DEFAULT_CHATWOOT_BEHAVIOR_SETTINGS,
  chatwootBehaviorSettingsSchema,
} from "@dosc-syspro/contracts/chatwoot";
import { usePlatformSettings } from "./use-platform-settings";

export function useChatwootBehaviorSettings() {
  const { data, isLoading, isSaving, setData, save } = usePlatformSettings({
    endpoint: "/api/platform/settings/chatwoot-behavior",
    schema: chatwootBehaviorSettingsSchema,
    defaultValue: DEFAULT_CHATWOOT_BEHAVIOR_SETTINGS,
    invalidMessage: "Configuracoes invalidas do Chatwoot.",
    saveErrorMessage: "Falha ao salvar automacoes do Chatwoot.",
    saveSuccessMessage: "Automacoes do Chatwoot salvas.",
  });

  return {
    behavior: data,
    isLoading,
    isSaving,
    setBehavior: setData,
    save,
  };
}
