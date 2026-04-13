import { SETTINGS_PERMISSION_DEFINITIONS, type SettingsPermissionsCatalog } from "@dosc-syspro/contracts/settings";
import { ACCESS_MATRIX, ROLE_LABELS } from "@/features/user-access/domain/permissions";

export function buildFallbackSettingsPermissionsCatalog(matrixEnabled = true): SettingsPermissionsCatalog {
  return {
    matrixEnabled,
    permissions: [...SETTINGS_PERMISSION_DEFINITIONS],
    profiles: (Object.entries(ACCESS_MATRIX) as Array<[keyof typeof ACCESS_MATRIX, (typeof ACCESS_MATRIX)[keyof typeof ACCESS_MATRIX]]>).map(
      ([key, permissions]) => ({
        key,
        label: ROLE_LABELS[key],
        permissions,
      }),
    ),
  };
}
