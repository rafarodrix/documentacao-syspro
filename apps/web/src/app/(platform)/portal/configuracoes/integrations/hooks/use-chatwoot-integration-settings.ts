import { useEffect, useState } from "react";
import {
  DEFAULT_CHATWOOT_INTEGRATION_SETTINGS,
  chatwootIntegrationSettingsSchema,
  type ChatwootIntegrationSettings,
} from "@dosc-syspro/contracts/chatwoot";
import { toast } from "sonner";

export function useChatwootIntegrationSettings() {
  const [integrationSettings, setIntegrationSettings] = useState<ChatwootIntegrationSettings>(
    DEFAULT_CHATWOOT_INTEGRATION_SETTINGS,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      setIsLoading(true);
      try {
        const response = await fetch("/api/platform/settings/chatwoot-config", { method: "GET", cache: "no-store" });
        const json = await response.json().catch(() => ({}));
        const parsed = chatwootIntegrationSettingsSchema.safeParse(json?.data);
        if (active) {
          setIntegrationSettings(parsed.success ? parsed.data : DEFAULT_CHATWOOT_INTEGRATION_SETTINGS);
        }
      } catch {
        if (active) {
          setIntegrationSettings(DEFAULT_CHATWOOT_INTEGRATION_SETTINGS);
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
    const parsed = chatwootIntegrationSettingsSchema.safeParse(integrationSettings);
    if (!parsed.success) {
      toast.error("Configuracao principal do Chatwoot invalida.");
      setIsSaving(false);
      return;
    }

    try {
      const response = await fetch("/api/platform/settings/chatwoot-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok || !json?.success) {
        toast.error(json?.error || "Falha ao salvar conexao principal do Chatwoot.");
        return;
      }

      const saved = chatwootIntegrationSettingsSchema.safeParse(json.data);
      if (saved.success) {
        setIntegrationSettings(saved.data);
      }
      toast.success(json?.message || "Configuracao principal do Chatwoot salva.");
    } catch {
      toast.error("Falha ao salvar conexao principal do Chatwoot.");
    } finally {
      setIsSaving(false);
    }
  }

  return { integrationSettings, isLoading, isSaving, setIntegrationSettings, save };
}
