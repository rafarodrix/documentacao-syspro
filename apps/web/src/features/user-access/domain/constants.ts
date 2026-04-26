import type { UserRoleValue } from "@dosc-syspro/contracts/user";

export const SYSTEM_ROLES: UserRoleValue[] = ["ADMIN", "DEVELOPER", "SUPORTE"];
export const CLIENT_ROLES: UserRoleValue[] = ["CLIENTE_ADMIN", "CLIENTE_USER"];
export const READ_ROLES: UserRoleValue[] = [...SYSTEM_ROLES, "CLIENTE_ADMIN"];
