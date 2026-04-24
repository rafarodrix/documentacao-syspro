import {
  SETTINGS_PERMISSION_DEFINITIONS,
  type SettingsPermissionKey,
  type SettingsPermissionProfile,
  type SettingsProfileKey,
} from '@dosc-syspro/contracts/settings';

const PROFILE_LABELS: Record<SettingsProfileKey, string> = {
  ADMIN: 'Administrador',
  DEVELOPER: 'Desenvolvedor',
  SUPORTE: 'Suporte',
  CLIENTE_ADMIN: 'Cliente Admin',
  CLIENTE_USER: 'Cliente Usuario',
};

export const DEFAULT_PROFILE_PERMISSIONS: Record<SettingsProfileKey, SettingsPermissionKey[]> = {
  ADMIN: SETTINGS_PERMISSION_DEFINITIONS.map((permission) => permission.key),
  DEVELOPER: SETTINGS_PERMISSION_DEFINITIONS.map((permission) => permission.key),
  SUPORTE: [
    "dashboard:view",
    "dashboard:stats_full",
    "dashboard:view_daily_password",
    "companies:view",
    "companies:view_all",
    "companies:create",
    "companies:edit",
    "companies:status",
    "contacts:view",
    "contacts:view_all",
    "contacts:create",
    "contacts:edit",
    "contacts:delete",
    "contacts:sync",
    "users:view",
    "users:view_all",
    "users:create",
    "users:edit",
    "users:status",
    "users:reset_password",
    "contracts:view",
    "contracts:edit",
    "crm:view",
    "crm:manage",
    "remote:view",
    "remote:manage",
    "atendimento:view",
    "settings:view",
    "tools:view",
    "tools:all",
    "tickets:view_all",
    "tickets:manage",
    "tax_reform:view",
    "system_team:view",
  ],
  CLIENTE_ADMIN: [
    "dashboard:view",
    "dashboard:view_daily_password",
    "companies:view",
    "companies:view_own",
    "companies:edit",
    "contacts:view",
    "contacts:view_team",
    "contacts:create",
    "contacts:edit",
    "contacts:delete",
    "users:view",
    "users:view_team",
    "users:create",
    "users:edit",
    "users:status",
    "contracts:view",
    "remote:view",
    "tickets:view_own",
    "tickets:create",
    "tools:view",
    "tools:basic",
  ],
  CLIENTE_USER: [
    "dashboard:view",
    "dashboard:view_daily_password",
    "tickets:view_own",
    "tickets:create",
    "tools:view",
    "tools:basic",
  ],
};

export function buildDefaultPermissionProfiles(): SettingsPermissionProfile[] {
  return (Object.entries(DEFAULT_PROFILE_PERMISSIONS) as Array<[SettingsProfileKey, SettingsPermissionKey[]]>).map(
    ([key, permissions]) => ({
      key,
      label: PROFILE_LABELS[key],
      permissions,
    }),
  );
}

export function getDefaultPermissionsForProfileKey(profileKey: SettingsProfileKey): SettingsPermissionKey[] {
  return DEFAULT_PROFILE_PERMISSIONS[profileKey] ?? [];
}

export { SETTINGS_PERMISSION_DEFINITIONS };
