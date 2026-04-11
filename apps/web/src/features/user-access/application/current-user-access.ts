import "server-only";

import { cache } from "react";
import type { Role } from "@prisma/client";
import type { SettingsPermissionKey } from "@dosc-syspro/contracts";
import { prisma } from "@/lib/prisma";
import { getProtectedSession } from "@/lib/auth-helpers";
import { ACCESS_MATRIX } from "@/features/user-access/domain/permissions";

type CurrentUserAuthorizationContext = {
  session: NonNullable<Awaited<ReturnType<typeof getProtectedSession>>>;
  fallbackPermissions: Set<SettingsPermissionKey>;
  globalPermissions: Set<SettingsPermissionKey>;
  companyPermissions: Map<string, Set<SettingsPermissionKey>>;
};

const ALL_PERMISSIONS = Object.values(ACCESS_MATRIX).flat();

function getFallbackPermissions(role: Role): SettingsPermissionKey[] {
  if (role === "ADMIN" || role === "DEVELOPER") {
    return Array.from(new Set(ALL_PERMISSIONS)) as SettingsPermissionKey[];
  }

  return (ACCESS_MATRIX[role] ?? []) as SettingsPermissionKey[];
}

export const getCurrentUserAuthorizationContext = cache(async (): Promise<CurrentUserAuthorizationContext | null> => {
  const session = await getProtectedSession();
  if (!session) return null;

  const fallbackPermissions = new Set<SettingsPermissionKey>(getFallbackPermissions(session.role as Role));
  const assignments = await prisma.userAccessProfile.findMany({
    where: {
      userId: session.userId,
      OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }],
      profile: { isActive: true },
    },
    select: {
      scopeType: true,
      companyId: true,
      profile: {
        select: {
          permissions: {
            select: {
              permission: {
                select: { key: true },
              },
            },
          },
        },
      },
    },
  });

  const globalPermissions = new Set<SettingsPermissionKey>();
  const companyPermissions = new Map<string, Set<SettingsPermissionKey>>();

  for (const assignment of assignments) {
    const permissionKeys = assignment.profile.permissions.map(
      (profilePermission) => profilePermission.permission.key as SettingsPermissionKey,
    );

    if (assignment.scopeType === "GLOBAL") {
      permissionKeys.forEach((permission) => globalPermissions.add(permission));
      continue;
    }

    if (!assignment.companyId) continue;
    const current = companyPermissions.get(assignment.companyId) ?? new Set<SettingsPermissionKey>();
    permissionKeys.forEach((permission) => current.add(permission));
    companyPermissions.set(assignment.companyId, current);
  }

  return {
    session,
    fallbackPermissions,
    globalPermissions,
    companyPermissions,
  };
});

export async function currentUserHasPermission(
  permission: SettingsPermissionKey,
  options?: { acceptCompanyScope?: boolean },
) {
  const context = await getCurrentUserAuthorizationContext();
  if (!context) return false;

  if (context.fallbackPermissions.has(permission)) {
    return true;
  }

  if (context.globalPermissions.has(permission)) {
    return true;
  }

  if (!options?.acceptCompanyScope) {
    return false;
  }

  return Array.from(context.companyPermissions.values()).some((permissions) => permissions.has(permission));
}

export async function currentUserHasAnyPermission(
  permissions: SettingsPermissionKey[],
  options?: { acceptCompanyScope?: boolean },
) {
  for (const permission of permissions) {
    if (await currentUserHasPermission(permission, options)) {
      return true;
    }
  }

  return false;
}
