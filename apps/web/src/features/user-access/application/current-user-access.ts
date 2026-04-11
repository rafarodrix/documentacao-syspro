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
  membershipCompanyIds: string[];
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
  const [assignments, memberships] = await Promise.all([
    prisma.userAccessProfile.findMany({
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
    }),
    prisma.membership.findMany({
      where: { userId: session.userId },
      select: { companyId: true },
    }),
  ]);

  const globalPermissions = new Set<SettingsPermissionKey>();
  const companyPermissions = new Map<string, Set<SettingsPermissionKey>>();
  const membershipCompanyIds = [...new Set(memberships.map((membership) => membership.companyId))];

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
    membershipCompanyIds,
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

export async function resolveCurrentUserCompanyAccessScope(
  scopedPermission: SettingsPermissionKey,
  globalPermission?: SettingsPermissionKey,
) {
  const context = await getCurrentUserAuthorizationContext();
  if (!context) {
    return { isGlobalView: false, companyIds: [] as string[], companyCount: 0 };
  }

  if (
    globalPermission &&
    (context.fallbackPermissions.has(globalPermission) || context.globalPermissions.has(globalPermission))
  ) {
    return { isGlobalView: true, companyIds: [] as string[], companyCount: 0 };
  }

  const scopedCompanyIds = new Set<string>();
  for (const [companyId, permissions] of context.companyPermissions.entries()) {
    if (permissions.has(scopedPermission)) {
      scopedCompanyIds.add(companyId);
    }
  }

  if (scopedCompanyIds.size > 0) {
    const companyIds = Array.from(scopedCompanyIds);
    return { isGlobalView: false, companyIds, companyCount: companyIds.length };
  }

  if (context.fallbackPermissions.has(scopedPermission)) {
    return {
      isGlobalView: false,
      companyIds: context.membershipCompanyIds,
      companyCount: context.membershipCompanyIds.length,
    };
  }

  return { isGlobalView: false, companyIds: [] as string[], companyCount: 0 };
}
