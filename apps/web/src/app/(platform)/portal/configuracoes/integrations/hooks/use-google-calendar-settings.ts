import { useEffect, useState } from "react";
import {
  DEFAULT_GOOGLE_CALENDAR_SETTINGS,
  googleCalendarSettingsSchema,
  type GoogleCalendarSettings,
} from "@dosc-syspro/contracts/settings";
import { toast } from "sonner";

export function useGoogleCalendarSettings() {
  const [settings, setSettings] = useState<GoogleCalendarSettings>(DEFAULT_GOOGLE_CALENDAR_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      setIsLoading(true);
      try {
        const response = await fetch("/api/platform/settings/google-calendar-config", { method: "GET", cache: "no-store" });
        const json = await response.json().catch(() => ({}));
        const parsed = googleCalendarSettingsSchema.safeParse(json?.data);
        if (active) {
          setSettings(parsed.success ? parsed.data : DEFAULT_GOOGLE_CALENDAR_SETTINGS);
        }
      } catch {
        if (active) {
          setSettings(DEFAULT_GOOGLE_CALENDAR_SETTINGS);
        }
      } finally {
        if (active) setIsLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, []);

  async function save() {
    setIsSaving(true);
    const parsed = googleCalendarSettingsSchema.safeParse(settings);
    if (!parsed.success) {
      toast.error("Configuracao do Google Agenda invalida.");
      setIsSaving(false);
      return;
    }

    try {
      const response = await fetch("/api/platform/settings/google-calendar-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok || !json?.success) {
        toast.error(json?.error || "Falha ao salvar configuracao do Google Agenda.");
        return;
      }

      const saved = googleCalendarSettingsSchema.safeParse(json.data);
      if (saved.success) {
        setSettings(saved.data);
      }
      toast.success(json?.message || "Configuracao do Google Agenda salva.");
    } catch {
      toast.error("Falha ao salvar configuracao do Google Agenda.");
    } finally {
      setIsSaving(false);
    }
  }

  return { settings, isLoading, isSaving, setSettings, save };
}
