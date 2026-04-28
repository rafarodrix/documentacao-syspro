import {
  SETTINGS_HIDDEN_PERMISSION_KEYS,
  SETTINGS_PERMISSION_DEFINITIONS,
  type SettingsPermissionsCatalog,
} from "@dosc-syspro/contracts/settings";
import { ACCESS_MATRIX, ROLE_LABELS } from "@/features/user-access/domain/permissions";

const HIDDEN_PERMISSION_KEYS = new Set<string>(SETTINGS_HIDDEN_PERMISSION_KEYS);

export function buildFallbackSettingsPermissionsCatalog(matrixEnabled = true): SettingsPermissionsCatalog {
  const visiblePermissions = SETTINGS_PERMISSION_DEFINITIONS.filter(
    (permission) => !HIDDEN_PERMISSION_KEYS.has(permission.key),
  );
  const visiblePermissionKeys = new Set(visiblePermissions.map((permission) => permission.key));

  return {
    matrixEnabled,
    permissions: [...visiblePermissions],
    profiles: (Object.entries(ACCESS_MATRIX) as Array<[keyof typeof ACCESS_MATRIX, (typeof ACCESS_MATRIX)[keyof typeof ACCESS_MATRIX]]>).map(
      ([key, permissions]) => ({
        key,
        label: ROLE_LABELS[key],
        permissions: permissions.filter((permission) => visiblePermissionKeys.has(permission)),
      }),
    ),
  };
}
