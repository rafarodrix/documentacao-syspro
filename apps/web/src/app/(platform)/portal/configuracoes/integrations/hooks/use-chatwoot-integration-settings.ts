import {
  DEFAULT_CHATWOOT_INTEGRATION_SETTINGS,
  chatwootIntegrationSettingsSchema,
} from "@dosc-syspro/contracts/chatwoot";
import { usePlatformSettings } from "./use-platform-settings";

export function useChatwootIntegrationSettings() {
  const { data, isLoading, isSaving, setData, save } = usePlatformSettings({
    endpoint: "/api/platform/settings/chatwoot-config",
    schema: chatwootIntegrationSettingsSchema,
    defaultValue: DEFAULT_CHATWOOT_INTEGRATION_SETTINGS,
    invalidMessage: "Configuracao principal do Chatwoot invalida.",
    saveErrorMessage: "Falha ao salvar conexao principal do Chatwoot.",
    saveSuccessMessage: "Configuracao principal do Chatwoot salva.",
  });

  return {
    integrationSettings: data,
    isLoading,
    isSaving,
    setIntegrationSettings: setData,
    save,
  };
}
