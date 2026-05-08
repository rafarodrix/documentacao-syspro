import {
  SETTINGS_PERMISSION_DEFINITIONS,
  type SettingsPermissionKey,
  type SettingsPermissionProfile,
  type SettingsProfileKey,
} from '@dosc-syspro/contracts/settings';

const DASHBOARD_VIEW_AVAILABILITY = "dashboard:view_availability" as SettingsPermissionKey;
const DASHBOARD_VIEW_DEVELOPMENT_SCOPE = "dashboard:view_development_scope" as SettingsPermissionKey;
const TICKETS_ROUTE_DEVELOPMENT = "tickets:route_development" as SettingsPermissionKey;
const TICKETS_OWN_SUPPORT_QUEUE = "tickets:own_support_queue" as SettingsPermissionKey;
const TICKETS_OWN_DEVELOPMENT_QUEUE = "tickets:own_development_queue" as SettingsPermissionKey;
const ALL_PERMISSION_KEYS = SETTINGS_PERMISSION_DEFINITIONS.map((permission) => permission.key) as SettingsPermissionKey[];

const PROFILE_LABELS: Record<SettingsProfileKey, string> = {
  ADMIN: 'Administrador',
  DEVELOPER: 'Desenvolvedor',
  SUPORTE: 'Suporte',
  CLIENTE_ADMIN: 'Cliente Admin',
  CLIENTE_USER: 'Cliente Usuario',
};

export const DEFAULT_PROFILE_PERMISSIONS: Record<SettingsProfileKey, SettingsPermissionKey[]> = {
  ADMIN: ALL_PERMISSION_KEYS.filter((permission) => permission !== DASHBOARD_VIEW_DEVELOPMENT_SCOPE),
  DEVELOPER: ALL_PERMISSION_KEYS.filter((permission) => permission !== TICKETS_OWN_SUPPORT_QUEUE),
  SUPORTE: [
    "profile:edit_personal",
    "profile:edit_company",
    "dashboard:view",
    "dashboard:stats_full",
    DASHBOARD_VIEW_AVAILABILITY,
    "dashboard:view_daily_password",
    "dashboard:release_trust",
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
    "contracts:delete",
    "crm:view",
    "crm:manage",
    "remote:view",
    "remote:manage",
    "agents:view",
    "agents:manage",
    "atendimento:view",
    "settings:view",
    "tools:view",
    "tools:all",
    "tickets:view_all",
    "tickets:manage",
    TICKETS_ROUTE_DEVELOPMENT,
    TICKETS_OWN_SUPPORT_QUEUE,
    "users:view_internal",
  ],
  CLIENTE_ADMIN: [
    "profile:edit_personal",
    "profile:edit_company",
    "dashboard:view",
    DASHBOARD_VIEW_AVAILABILITY,
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
    "agents:view",
    "tickets:view_own",
    "tickets:create",
    "tools:view",
    "tools:basic",
  ],
  CLIENTE_USER: [
    "profile:edit_personal",
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
