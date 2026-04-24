import { useEffect, useState } from "react";
import {
  DEFAULT_TICKET_MODULE_SETTINGS,
  type TicketModuleSettings,
} from "@dosc-syspro/contracts/ticket";

let cachedSettings: TicketModuleSettings | null = null;
let pendingSettingsRequest: Promise<TicketModuleSettings> | null = null;

async function requestTicketModuleSettings() {
  const response = await fetch("/api/platform/settings/tickets", {
    method: "GET",
    cache: "no-store",
  });
  const json = (await response.json()) as {
    success?: boolean;
    data?: TicketModuleSettings;
  };

  if (json?.success && json.data) {
    cachedSettings = json.data;
    return json.data;
  }

  return DEFAULT_TICKET_MODULE_SETTINGS;
}

export async function fetchTicketModuleSettings(force = false) {
  if (!force && cachedSettings) {
    return cachedSettings;
  }

  if (!force && pendingSettingsRequest) {
    return pendingSettingsRequest;
  }

  pendingSettingsRequest = requestTicketModuleSettings()
    .catch(() => DEFAULT_TICKET_MODULE_SETTINGS)
    .finally(() => {
      pendingSettingsRequest = null;
    });

  return pendingSettingsRequest;
}

export function useTicketModuleSettings() {
  const [ticketSettings, setTicketSettings] = useState<TicketModuleSettings>(
    cachedSettings ?? DEFAULT_TICKET_MODULE_SETTINGS,
  );

  useEffect(() => {
    let active = true;

    fetchTicketModuleSettings()
      .then((settings) => {
        if (active) {
          setTicketSettings(settings);
        }
      })
      .catch(() => {
        if (active) {
          setTicketSettings(DEFAULT_TICKET_MODULE_SETTINGS);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  return ticketSettings;
}

export function getSuggestedCategoryForTeam(
  settings: TicketModuleSettings,
  team: string,
) {
  return settings.categories.find((category) => category.defaultTeam === team)?.value || "";
}
