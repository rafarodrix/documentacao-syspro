import {
  SETTINGS_PERMISSION_KEY_VALUES,
  type SettingsPermissionKey,
} from "@dosc-syspro/contracts/settings";

const VALID_PERMISSION_KEYS = new Set<string>(SETTINGS_PERMISSION_KEY_VALUES);

function isValidPermissionKey(value: unknown): value is SettingsPermissionKey {
  return typeof value === "string" && VALID_PERMISSION_KEYS.has(value);
}

function sanitizePermissionList(value: unknown): SettingsPermissionKey[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isValidPermissionKey);
}

export function sanitizeSettingsAuthorizationContextResponse<T extends Record<string, any>>(response: T): T {
  if (!response?.data || typeof response.data !== "object") {
    return response;
  }

  const data = response.data as Record<string, any>;
  const companyPermissions =
    data.companyPermissions && typeof data.companyPermissions === "object"
      ? Object.fromEntries(
          Object.entries(data.companyPermissions).map(([companyId, permissions]) => [
            companyId,
            sanitizePermissionList(permissions),
          ]),
        )
      : {};

  return {
    ...response,
    data: {
      ...data,
      fallbackPermissions: sanitizePermissionList(data.fallbackPermissions),
      globalPermissions: sanitizePermissionList(data.globalPermissions),
      companyPermissions,
    },
  };
}

export function sanitizeSettingsPermissionsResponse<T extends Record<string, any>>(response: T): T {
  if (!response?.data || typeof response.data !== "object") {
    return response;
  }

  const data = response.data as Record<string, any>;
  const catalog =
    data.catalog && typeof data.catalog === "object"
      ? {
          ...data.catalog,
          permissions: Array.isArray(data.catalog.permissions)
            ? data.catalog.permissions.filter(
                (permission) => permission && isValidPermissionKey(permission.key),
              )
            : [],
          profiles: Array.isArray(data.catalog.profiles)
            ? data.catalog.profiles.map((profile) => ({
                ...profile,
                permissions: sanitizePermissionList(profile?.permissions),
              }))
            : [],
        }
      : data.catalog;

  return {
    ...response,
    data: {
      ...data,
      catalog,
      profiles: Array.isArray(data.profiles)
        ? data.profiles.map((profile) => ({
            ...profile,
            permissions: sanitizePermissionList(profile?.permissions),
          }))
        : [],
    },
  };
}
