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
} from "@dosc-syspro/contracts/settings";
import { callWebApi } from "@/lib/web-api";

export async function fetchSettingsPermissionsCatalogGateway(): Promise<SettingsPermissionsCatalogResponse> {
  return settingsPermissionsCatalogResponseSchema.parse(await callWebApi("/api/platform/settings/permissions").then((res) => res.json()));
}

export async function fetchSettingsPermissionsAdminViewGateway(): Promise<SettingsPermissionsAdminViewResponse> {
  return settingsPermissionsAdminViewResponseSchema.parse(await callWebApi("/api/platform/settings/permissions/admin-view").then((res) => res.json()));
}

export async function updateSettingsPermissionsMatrixVisibilityGateway(
  enabled: boolean,
): Promise<SettingsPermissionsMutationResponse> {
  const payload = settingsPermissionsMatrixVisibilityUpdateSchema.parse({ enabled });
  return settingsPermissionsMutationResponseSchema.parse(
    await callWebApi("/api/platform/settings/permissions/matrix-visibility", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).then((res) => res.json()),
  );
}

export async function saveSettingsAccessProfileGateway(
  input: SettingsAccessProfileUpsertInput,
): Promise<SettingsPermissionsMutationResponse> {
  const payload = settingsAccessProfileUpsertSchema.parse(input);
  return settingsPermissionsMutationResponseSchema.parse(
    await callWebApi("/api/platform/settings/permissions/profiles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).then((res) => res.json()),
  );
}

export async function createSettingsUserAccessProfileGateway(
  input: SettingsUserAccessProfileCreateInput,
): Promise<SettingsPermissionsMutationResponse> {
  const payload = settingsUserAccessProfileCreateSchema.parse(input);
  return settingsPermissionsMutationResponseSchema.parse(
    await callWebApi("/api/platform/settings/permissions/assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).then((res) => res.json()),
  );
}

export async function removeSettingsUserAccessProfileGateway(
  assignmentId: string,
): Promise<SettingsPermissionsMutationResponse> {
  return settingsPermissionsMutationResponseSchema.parse(
    await callWebApi(`/api/platform/settings/permissions/assignments/${assignmentId}`, {
      method: "DELETE",
    }).then((res) => res.json()),
  );
}
