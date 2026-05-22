import { useEffect, useState } from "react";
import {
  DEFAULT_STORAGE_R2_SETTINGS,
  storageR2SettingsSchema,
  type StorageR2Settings,
} from "@dosc-syspro/contracts/settings";
import { toast } from "sonner";

export function useStorageSettings() {
  const [settings, setSettings] = useState<StorageR2Settings>(DEFAULT_STORAGE_R2_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      setIsLoading(true);
      try {
        const response = await fetch("/api/platform/settings/storage-config", { method: "GET", cache: "no-store" });
        const json = await response.json().catch(() => ({}));
        const parsed = storageR2SettingsSchema.safeParse(json?.data);
        if (active) {
          setSettings(parsed.success ? parsed.data : DEFAULT_STORAGE_R2_SETTINGS);
        }
      } catch {
        if (active) {
          setSettings(DEFAULT_STORAGE_R2_SETTINGS);
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
    const parsed = storageR2SettingsSchema.safeParse(settings);
    if (!parsed.success) {
      toast.error("Configuracao de storage invalida.");
      setIsSaving(false);
      return;
    }

    try {
      const response = await fetch("/api/platform/settings/storage-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok || !json?.success) {
        toast.error(json?.error || "Falha ao salvar configuracao de storage.");
        return;
      }

      const saved = storageR2SettingsSchema.safeParse(json.data);
      if (saved.success) {
        setSettings(saved.data);
      }
      toast.success(json?.message || "Configuracao de storage salva.");
    } catch {
      toast.error("Falha ao salvar configuracao de storage.");
    } finally {
      setIsSaving(false);
    }
  }

  return { settings, isLoading, isSaving, setSettings, save };
}
