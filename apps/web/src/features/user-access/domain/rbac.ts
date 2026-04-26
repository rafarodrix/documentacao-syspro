import type { UserRoleValue } from "@dosc-syspro/contracts/user";
import { ACCESS_MATRIX, PermissionKey } from "@/features/user-access/domain/permissions";

export function hasPermission(role: UserRoleValue, permission: PermissionKey): boolean {
  if (role === "ADMIN" || role === "DEVELOPER") {
    return true;
  }

  const allowedPermissions = ACCESS_MATRIX[role];
  if (!allowedPermissions) {
    return false;
  }

  return allowedPermissions.includes(permission);
}

export function hasAnyPermission(role: UserRoleValue, permissions: PermissionKey[]): boolean {
  if (role === "ADMIN" || role === "DEVELOPER") return true;
  return permissions.some((permission) => hasPermission(role, permission));
}
