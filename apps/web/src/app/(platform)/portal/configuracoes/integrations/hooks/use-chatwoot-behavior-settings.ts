import { useEffect, useState } from "react";
import {
  DEFAULT_CHATWOOT_BEHAVIOR_SETTINGS,
  chatwootBehaviorSettingsSchema,
  type ChatwootBehaviorSettings,
} from "@dosc-syspro/contracts/chatwoot";
import { toast } from "sonner";

export function useChatwootBehaviorSettings() {
  const [behavior, setBehavior] = useState<ChatwootBehaviorSettings>(DEFAULT_CHATWOOT_BEHAVIOR_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      setIsLoading(true);
      try {
        const response = await fetch("/api/platform/settings/chatwoot-behavior", { method: "GET", cache: "no-store" });
        const json = await response.json().catch(() => ({}));
        const parsed = chatwootBehaviorSettingsSchema.safeParse(json?.data);
        if (active) {
          setBehavior(parsed.success ? parsed.data : DEFAULT_CHATWOOT_BEHAVIOR_SETTINGS);
        }
      } catch {
        if (active) {
          setBehavior(DEFAULT_CHATWOOT_BEHAVIOR_SETTINGS);
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
    const parsed = chatwootBehaviorSettingsSchema.safeParse(behavior);
    if (!parsed.success) {
      toast.error("Configuracoes invalidas do Chatwoot.");
      setIsSaving(false);
      return;
    }

    try {
      const response = await fetch("/api/platform/settings/chatwoot-behavior", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok || !json?.success) {
        toast.error(json?.error || "Falha ao salvar automacoes do Chatwoot.");
        return;
      }

      const saved = chatwootBehaviorSettingsSchema.safeParse(json.data);
      if (saved.success) {
        setBehavior(saved.data);
      }
      toast.success(json?.message || "Automacoes do Chatwoot salvas.");
    } catch {
      toast.error("Falha ao salvar automacoes do Chatwoot.");
    } finally {
      setIsSaving(false);
    }
  }

  return { behavior, isLoading, isSaving, setBehavior, save };
}
