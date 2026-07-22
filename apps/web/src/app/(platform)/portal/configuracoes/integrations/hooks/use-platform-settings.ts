import { useEffect, useState } from "react";
import type { z } from "zod";
import { toast } from "sonner";

export interface UsePlatformSettingsOptions<T> {
  endpoint: string;
  schema: z.ZodType<T>;
  defaultValue: T;
  invalidMessage: string;
  saveErrorMessage: string;
  saveSuccessMessage: string;
}

/**
 * Hook generico reutilizavel para carregamento e salvamento de configuracoes da plataforma.
 * Elimina duplicacao de estados (isLoading, isSaving), tratamentos de erro e manipulacao de fetch.
 */
export function usePlatformSettings<T>({
  endpoint,
  schema,
  defaultValue,
  invalidMessage,
  saveErrorMessage,
  saveSuccessMessage,
}: UsePlatformSettingsOptions<T>) {
  const [data, setData] = useState<T>(defaultValue);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      setIsLoading(true);
      try {
        const response = await fetch(endpoint, { method: "GET", cache: "no-store" });
        const json = await response.json().catch(() => ({}));
        const parsed = schema.safeParse(json?.data);
        if (active) {
          setData(parsed.success ? parsed.data : defaultValue);
        }
      } catch {
        if (active) {
          setData(defaultValue);
        }
      } finally {
        if (active) setIsLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [endpoint, schema, defaultValue]);

  async function save() {
    setIsSaving(true);
    const parsed = schema.safeParse(data);
    if (!parsed.success) {
      toast.error(invalidMessage);
      setIsSaving(false);
      return;
    }

    try {
      const response = await fetch(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok || !json?.success) {
        toast.error(json?.error || saveErrorMessage);
        return;
      }

      const saved = schema.safeParse(json.data);
      if (saved.success) {
        setData(saved.data);
      }
      toast.success(json?.message || saveSuccessMessage);
    } catch {
      toast.error(saveErrorMessage);
    } finally {
      setIsSaving(false);
    }
  }

  return { data, isLoading, isSaving, setData, save };
}
