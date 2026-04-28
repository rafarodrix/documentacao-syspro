import {
  platformNotificationsResponseSchema,
  type PlatformNotificationsResponse,
} from "@dosc-syspro/contracts/platform-notifications";
import {
  remoteModuleSettingsSchema,
  remoteModuleSettingsResponseSchema,
  type RemoteModuleSettings,
  type RemoteModuleSettingsResponse,
} from "@dosc-syspro/contracts/remote";
import {
  ticketModuleSettingsResponseSchema,
  ticketModuleSettingsSchema,
  type TicketModuleSettings,
  type TicketModuleSettingsResponse,
} from "@dosc-syspro/contracts/ticket";
import {
  chatwootBehaviorSettingsResponseSchema,
  chatwootBehaviorSettingsSchema,
  type ChatwootBehaviorSettings,
  type ChatwootBehaviorSettingsResponse,
} from "@dosc-syspro/contracts/chatwoot";
import {
  settingsAuthorizationContextResponseSchema,
  settingsContractsAdminViewResponseSchema,
  settingsRemoteAdminViewResponseSchema,
  settingsSchema,
  type SettingsAuthorizationContextResponse,
  type SettingsContractsAdminViewResponse,
  type SettingsRemoteAdminViewResponse,
  type SettingsOutput,
} from "@dosc-syspro/contracts/settings";
import { sefazRoutesSchema, type SefazRoutesInput } from "@dosc-syspro/contracts/sefaz-routes";
import { callWebApi } from "@/lib/web-api";
import { sanitizeSettingsAuthorizationContextResponse } from "./sanitize-settings-permissions";

type SettingsGatewayResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
};

async function callSettingsApi<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await callWebApi(`/api/platform/settings${path}`, init);
  return response.json() as Promise<T>;
}

export type IntegrationDiagnosticsResponse = {
  success: boolean;
  chatwoot?: {
    configured: boolean;
    source: string | null;
    activeConnections: number;
    runtime: Record<string, boolean>;
    diagnostics: unknown;
    behavior?: ChatwootBehaviorSettings;
  };
  storage?: {
    provider: string;
    configured: boolean;
    mode: "public_base_url" | "signed_url";
    endpointHost: string | null;
    bucketName: string | null;
    publicBaseUrl: string | null;
    signedUrlTtlSeconds: number;
    hasAccessKeyId: boolean;
    hasSecretAccessKey: boolean;
    issues: string[];
  };
  error?: string;
};

export async function fetchGeneralSettingsGateway(): Promise<SettingsGatewayResponse<SettingsOutput>> {
  const response = await callSettingsApi<SettingsGatewayResponse<SettingsOutput>>("/general");
  if (response.data) {
    response.data = settingsSchema.parse(response.data);
  }
  return response;
}

export async function updateGeneralSettingsGateway(
  input: SettingsOutput,
): Promise<SettingsGatewayResponse<void>> {
  const payload = settingsSchema.parse(input);
  return callSettingsApi<SettingsGatewayResponse<void>>("/general", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function fetchSefazRoutesGateway(): Promise<SettingsGatewayResponse<SefazRoutesInput>> {
  const response = await callSettingsApi<SettingsGatewayResponse<SefazRoutesInput>>("/sefaz-routes");
  if (response.data) {
    response.data = sefazRoutesSchema.parse(response.data);
  }
  return response;
}

export async function updateSefazRoutesGateway(
  input: SefazRoutesInput,
): Promise<SettingsGatewayResponse<void>> {
  const payload = sefazRoutesSchema.parse(input);
  return callSettingsApi<SettingsGatewayResponse<void>>("/sefaz-routes", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function runSefazCheckGateway(): Promise<SettingsGatewayResponse<{ count: number }>> {
  return callSettingsApi<SettingsGatewayResponse<{ count: number }>>("/sefaz/check", {
    method: "POST",
  });
}

export async function fetchSettingsContractsAdminViewGateway(): Promise<SettingsContractsAdminViewResponse> {
  return settingsContractsAdminViewResponseSchema.parse(
    await callSettingsApi<SettingsContractsAdminViewResponse>("/contracts/admin-view"),
  );
}

export async function fetchSettingsRemoteAdminViewGateway(): Promise<SettingsRemoteAdminViewResponse> {
  return settingsRemoteAdminViewResponseSchema.parse(
    await callSettingsApi<SettingsRemoteAdminViewResponse>("/remote/admin-view"),
  );
}

export async function fetchSettingsAuthorizationContextGateway(): Promise<SettingsAuthorizationContextResponse> {
  return settingsAuthorizationContextResponseSchema.parse(
    sanitizeSettingsAuthorizationContextResponse(
      await callSettingsApi<SettingsAuthorizationContextResponse>("/authorization/context"),
    ),
  );
}

export async function fetchRemoteModuleSettingsGateway(): Promise<RemoteModuleSettingsResponse> {
  return remoteModuleSettingsResponseSchema.parse(
    await callSettingsApi<RemoteModuleSettingsResponse>("/remote/module-settings"),
  );
}

export async function updateRemoteModuleSettingsGateway(
  input: RemoteModuleSettings,
): Promise<RemoteModuleSettingsResponse> {
  const payload = remoteModuleSettingsSchema.parse(input);
  return remoteModuleSettingsResponseSchema.parse(
    await callSettingsApi<RemoteModuleSettingsResponse>("/remote/module-settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  );
}

export async function fetchPlatformNotificationsGateway(): Promise<PlatformNotificationsResponse> {
  return platformNotificationsResponseSchema.parse(
    await callWebApi("/api/platform/notifications").then((res) => res.json() as Promise<PlatformNotificationsResponse>),
  );
}

export async function fetchTicketModuleSettingsGateway(): Promise<TicketModuleSettingsResponse> {
  return ticketModuleSettingsResponseSchema.parse(
    await callSettingsApi<TicketModuleSettingsResponse>("/tickets"),
  );
}

export async function updateTicketModuleSettingsGateway(
  input: TicketModuleSettings,
): Promise<TicketModuleSettingsResponse> {
  const payload = ticketModuleSettingsSchema.parse(input);
  return ticketModuleSettingsResponseSchema.parse(
    await callSettingsApi<TicketModuleSettingsResponse>("/tickets", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  );
}

export async function fetchIntegrationDiagnosticsGateway(): Promise<IntegrationDiagnosticsResponse> {
  return callSettingsApi<IntegrationDiagnosticsResponse>("/integrations/diagnostics");
}

export async function fetchChatwootBehaviorSettingsGateway(): Promise<ChatwootBehaviorSettingsResponse> {
  return chatwootBehaviorSettingsResponseSchema.parse(
    await callSettingsApi<ChatwootBehaviorSettingsResponse>("/chatwoot/behavior"),
  );
}

export async function updateChatwootBehaviorSettingsGateway(
  input: ChatwootBehaviorSettings,
): Promise<ChatwootBehaviorSettingsResponse> {
  const payload = chatwootBehaviorSettingsSchema.parse(input);
  return chatwootBehaviorSettingsResponseSchema.parse(
    await callSettingsApi<ChatwootBehaviorSettingsResponse>("/chatwoot/behavior", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  );
}
