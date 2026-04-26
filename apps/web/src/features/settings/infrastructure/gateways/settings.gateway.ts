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
import { callBackendApi } from "@/lib/backend-api-client";

type SettingsGatewayResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
};

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
  const response = await callBackendApi<SettingsGatewayResponse<SettingsOutput>>("settings", "/general");
  if (response.data) {
    response.data = settingsSchema.parse(response.data);
  }
  return response;
}

export async function updateGeneralSettingsGateway(
  input: SettingsOutput,
): Promise<SettingsGatewayResponse<void>> {
  const payload = settingsSchema.parse(input);
  return callBackendApi<SettingsGatewayResponse<void>>("settings", "/general", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function fetchSefazRoutesGateway(): Promise<SettingsGatewayResponse<SefazRoutesInput>> {
  const response = await callBackendApi<SettingsGatewayResponse<SefazRoutesInput>>("settings", "/sefaz-routes");
  if (response.data) {
    response.data = sefazRoutesSchema.parse(response.data);
  }
  return response;
}

export async function updateSefazRoutesGateway(
  input: SefazRoutesInput,
): Promise<SettingsGatewayResponse<void>> {
  const payload = sefazRoutesSchema.parse(input);
  return callBackendApi<SettingsGatewayResponse<void>>("settings", "/sefaz-routes", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function runSefazCheckGateway(): Promise<SettingsGatewayResponse<{ count: number }>> {
  return callBackendApi<SettingsGatewayResponse<{ count: number }>>("settings", "/sefaz/check", {
    method: "POST",
  });
}

export async function fetchSettingsContractsAdminViewGateway(): Promise<SettingsContractsAdminViewResponse> {
  return settingsContractsAdminViewResponseSchema.parse(
    await callBackendApi<SettingsContractsAdminViewResponse>("settings", "/contracts/admin-view"),
  );
}

export async function fetchSettingsRemoteAdminViewGateway(): Promise<SettingsRemoteAdminViewResponse> {
  return settingsRemoteAdminViewResponseSchema.parse(
    await callBackendApi<SettingsRemoteAdminViewResponse>("settings", "/remote/admin-view"),
  );
}

export async function fetchSettingsAuthorizationContextGateway(): Promise<SettingsAuthorizationContextResponse> {
  return settingsAuthorizationContextResponseSchema.parse(
    await callBackendApi<SettingsAuthorizationContextResponse>("settings", "/authorization/context"),
  );
}

export async function fetchRemoteModuleSettingsGateway(): Promise<RemoteModuleSettingsResponse> {
  return remoteModuleSettingsResponseSchema.parse(
    await callBackendApi<RemoteModuleSettingsResponse>("settings", "/remote/module-settings"),
  );
}

export async function updateRemoteModuleSettingsGateway(
  input: RemoteModuleSettings,
): Promise<RemoteModuleSettingsResponse> {
  const payload = remoteModuleSettingsSchema.parse(input);
  return remoteModuleSettingsResponseSchema.parse(
    await callBackendApi<RemoteModuleSettingsResponse>("settings", "/remote/module-settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  );
}

export async function fetchPlatformNotificationsGateway(): Promise<PlatformNotificationsResponse> {
  return platformNotificationsResponseSchema.parse(
    await callBackendApi<PlatformNotificationsResponse>("settings", "/platform-notifications"),
  );
}

export async function fetchTicketModuleSettingsGateway(): Promise<TicketModuleSettingsResponse> {
  return ticketModuleSettingsResponseSchema.parse(
    await callBackendApi<TicketModuleSettingsResponse>("settings", "/tickets"),
  );
}

export async function updateTicketModuleSettingsGateway(
  input: TicketModuleSettings,
): Promise<TicketModuleSettingsResponse> {
  const payload = ticketModuleSettingsSchema.parse(input);
  return ticketModuleSettingsResponseSchema.parse(
    await callBackendApi<TicketModuleSettingsResponse>("settings", "/tickets", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  );
}

export async function fetchIntegrationDiagnosticsGateway(): Promise<IntegrationDiagnosticsResponse> {
  return callBackendApi<IntegrationDiagnosticsResponse>("settings", "/integrations/diagnostics");
}

export async function fetchChatwootBehaviorSettingsGateway(): Promise<ChatwootBehaviorSettingsResponse> {
  return chatwootBehaviorSettingsResponseSchema.parse(
    await callBackendApi<ChatwootBehaviorSettingsResponse>("settings", "/chatwoot/behavior"),
  );
}

export async function updateChatwootBehaviorSettingsGateway(
  input: ChatwootBehaviorSettings,
): Promise<ChatwootBehaviorSettingsResponse> {
  const payload = chatwootBehaviorSettingsSchema.parse(input);
  return chatwootBehaviorSettingsResponseSchema.parse(
    await callBackendApi<ChatwootBehaviorSettingsResponse>("settings", "/chatwoot/behavior", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  );
}
