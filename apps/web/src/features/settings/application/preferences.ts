"use client";

import { settingsSchema, type SettingsPreferencesOutput } from "@dosc-syspro/contracts/settings";

export async function fetchSettingsPreferences(): Promise<SettingsPreferencesOutput | null> {
  try {
    const response = await fetch("/api/platform/settings/general", { cache: "no-store" });
    if (!response.ok) return null;

    const payload = await response.json();
    const parsed = settingsSchema.safeParse(payload?.data);
    if (!parsed.success) return null;

    return parsed.data.preferences;
  } catch {
    return null;
  }
}
