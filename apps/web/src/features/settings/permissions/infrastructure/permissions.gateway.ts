import {
  settingsAccessProfileUpsertSchema,
  settingsPermissionsAdminViewResponseSchema,
  settingsPermissionsCatalogResponseSchema,
  settingsPermissionsMatrixVisibilityUpdateSchema,
  settingsPermissionsMutationResponseSchema,
  settingsUserAccessProfileCreateSchema,
  type SettingsAccessProfileUpsertInput,
  type SettingsPermissionsAdminViewResponse,
  type SettingsPermissionsCatalogResponse,
  type SettingsPermissionsMutationResponse,
  type SettingsUserAccessProfileCreateInput,
} from "@dosc-syspro/contracts";
import { callBackendApi } from "@/lib/backend-api-client";

export async function fetchSettingsPermissionsCatalogGateway(): Promise<SettingsPermissionsCatalogResponse> {
  return settingsPermissionsCatalogResponseSchema.parse(await callBackendApi("settings", "/permissions"));
}

export async function fetchSettingsPermissionsAdminViewGateway(): Promise<SettingsPermissionsAdminViewResponse> {
  return settingsPermissionsAdminViewResponseSchema.parse(await callBackendApi("settings", "/permissions/admin-view"));
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

export async function saveSettingsAccessProfileGateway(
  input: SettingsAccessProfileUpsertInput,
): Promise<SettingsPermissionsMutationResponse> {
  const payload = settingsAccessProfileUpsertSchema.parse(input);
  return settingsPermissionsMutationResponseSchema.parse(
    await callBackendApi("settings", "/permissions/profiles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  );
}

export async function createSettingsUserAccessProfileGateway(
  input: SettingsUserAccessProfileCreateInput,
): Promise<SettingsPermissionsMutationResponse> {
  const payload = settingsUserAccessProfileCreateSchema.parse(input);
  return settingsPermissionsMutationResponseSchema.parse(
    await callBackendApi("settings", "/permissions/assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  );
}

export async function removeSettingsUserAccessProfileGateway(
  assignmentId: string,
): Promise<SettingsPermissionsMutationResponse> {
  return settingsPermissionsMutationResponseSchema.parse(
    await callBackendApi("settings", `/permissions/assignments/${assignmentId}`, {
      method: "DELETE",
    }),
  );
}
