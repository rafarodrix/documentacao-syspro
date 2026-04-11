import {
  settingsPermissionsCatalogResponseSchema,
  settingsPermissionsMatrixVisibilityUpdateSchema,
  settingsPermissionsMutationResponseSchema,
  type SettingsPermissionsCatalogResponse,
  type SettingsPermissionsMutationResponse,
} from "@dosc-syspro/contracts";
import { callBackendApi } from "@/lib/backend-api-client";

export async function fetchSettingsPermissionsCatalogGateway(): Promise<SettingsPermissionsCatalogResponse> {
  return settingsPermissionsCatalogResponseSchema.parse(await callBackendApi("settings", "/permissions"));
}

export async function updateSettingsPermissionsMatrixVisibilityGateway(
  enabled: boolean,
): Promise<SettingsPermissionsMutationResponse> {
  const payload = settingsPermissionsMatrixVisibilityUpdateSchema.parse({ enabled });
  return settingsPermissionsMutationResponseSchema.parse(
    await callBackendApi("settings", "/permissions/matrix-visibility", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  );
}
