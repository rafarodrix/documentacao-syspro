import { Role } from "@prisma/client";
import { ACCESS_MATRIX, PermissionKey } from "@/features/user-access/domain/permissions";

export function hasPermission(role: Role, permission: PermissionKey): boolean {
  if (role === Role.ADMIN || role === Role.DEVELOPER) {
    return true;
  }

  const allowedPermissions = ACCESS_MATRIX[role];
  if (!allowedPermissions) {
    return false;
  }

  return allowedPermissions.includes(permission);
}

export function hasAnyPermission(role: Role, permissions: PermissionKey[]): boolean {
  if (role === Role.ADMIN || role === Role.DEVELOPER) return true;
  return permissions.some((permission) => hasPermission(role, permission));
}
