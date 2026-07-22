import {
  DEFAULT_GOOGLE_CALENDAR_SETTINGS,
  googleCalendarSettingsSchema,
} from "@dosc-syspro/contracts/settings";
import { usePlatformSettings } from "./use-platform-settings";

export function useGoogleCalendarSettings() {
  const { data, isLoading, isSaving, setData, save } = usePlatformSettings({
    endpoint: "/api/platform/settings/google-calendar-config",
    schema: googleCalendarSettingsSchema,
    defaultValue: DEFAULT_GOOGLE_CALENDAR_SETTINGS,
    invalidMessage: "Configuracao do Google Agenda invalida.",
    saveErrorMessage: "Falha ao salvar configuracao do Google Agenda.",
    saveSuccessMessage: "Configuracao do Google Agenda salva.",
  });

  return {
    settings: data,
    isLoading,
    isSaving,
    setSettings: setData,
    save,
  };
}
