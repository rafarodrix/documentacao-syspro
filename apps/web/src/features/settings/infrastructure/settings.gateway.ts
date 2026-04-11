import {
  sefazRoutesSchema,
  settingsSchema,
  type SefazRoutesInput,
  type SettingsOutput,
} from "@dosc-syspro/contracts";
import { callBackendApi } from "@/lib/backend-api-client";

type SettingsGatewayResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
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
