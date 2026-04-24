import { Role } from "@prisma/client";
import { ROLE_LABELS as APP_ROLE_LABELS } from "@dosc-syspro/core";
import {
  SETTINGS_PERMISSION_DEFINITIONS,
  type SettingsPermissionKey,
} from "@dosc-syspro/contracts/settings";

export const ROLE_LABELS: Record<Role, string> = APP_ROLE_LABELS as Record<Role, string>;

export const SYSTEM_PERMISSIONS = Object.fromEntries(
  SETTINGS_PERMISSION_DEFINITIONS.map((permission) => [permission.key, permission.label]),
) as Record<SettingsPermissionKey, string>;

export type PermissionKey = SettingsPermissionKey;
export type AccessControlMatrix = Record<Role, SettingsPermissionKey[]>;

export const ACCESS_MATRIX: AccessControlMatrix = {
  ADMIN: Object.keys(SYSTEM_PERMISSIONS) as PermissionKey[],
  DEVELOPER: Object.keys(SYSTEM_PERMISSIONS) as PermissionKey[],

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
