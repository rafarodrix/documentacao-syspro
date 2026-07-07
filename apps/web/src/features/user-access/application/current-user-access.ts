import "server-only";

import { cache } from "react";
import type { SettingsAuthorizationContext, SettingsPermissionKey } from "@dosc-syspro/contracts/settings";
import { getProtectedSession } from "@/lib/auth-helpers";
import { fetchSettingsAuthorizationContextGateway } from "@/features/settings/infrastructure/gateways/settings.gateway";

type CurrentUserAuthorizationContext = {
  session: NonNullable<Awaited<ReturnType<typeof getProtectedSession>>>;
  basePermissions: Set<SettingsPermissionKey>;
  globalPermissions: Set<SettingsPermissionKey>;
  companyPermissions: Map<string, Set<SettingsPermissionKey>>;
  membershipCompanyIds: string[];
};

function mapAuthorizationContext(
  session: NonNullable<Awaited<ReturnType<typeof getProtectedSession>>>,
  data: SettingsAuthorizationContext,
): CurrentUserAuthorizationContext {
  return {
    session,
    basePermissions: new Set<SettingsPermissionKey>(data.fallbackPermissions),
    globalPermissions: new Set<SettingsPermissionKey>(data.globalPermissions),
    companyPermissions: new Map(
      Object.entries(data.companyPermissions).map(([companyId, permissions]) => [
        companyId,
        new Set<SettingsPermissionKey>(permissions),
      ]),
    ),
    membershipCompanyIds: data.membershipCompanyIds,
  };
}

export const getCurrentUserAuthorizationContext = cache(async (): Promise<CurrentUserAuthorizationContext | null> => {
  const session = await getProtectedSession();
  if (!session) return null;

  try {
    const response = await fetchSettingsAuthorizationContextGateway();
    if (response.success && response.data) {
      return mapAuthorizationContext(session, response.data);
    }
  } catch (error) {
    console.error("[current-user-access] Falha ao carregar contexto central de autorizacao; negando permissoes por seguranca.", error);
  }

  return {
    session,
    basePermissions: new Set<SettingsPermissionKey>(),
    globalPermissions: new Set<SettingsPermissionKey>(),
    companyPermissions: new Map<string, Set<SettingsPermissionKey>>(),
    membershipCompanyIds: [],
  };
});

export async function currentUserHasPermission(
  permission: SettingsPermissionKey,
  options?: { acceptCompanyScope?: boolean },
) {
  const context = await getCurrentUserAuthorizationContext();
  if (!context) return false;

  if (context.basePermissions.has(permission)) {
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
    context.globalPermissions.has(scopedPermission) ||
    (globalPermission &&
      (context.basePermissions.has(globalPermission) || context.globalPermissions.has(globalPermission)))
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

  if (context.basePermissions.has(scopedPermission)) {
    return {
      isGlobalView: false,
      companyIds: context.membershipCompanyIds,
      companyCount: context.membershipCompanyIds.length,
    };
  }

  return { isGlobalView: false, companyIds: [] as string[], companyCount: 0 };
}

export async function currentUserCanAccessCompany(
  companyId: string,
  scopedPermission: SettingsPermissionKey,
  globalPermission?: SettingsPermissionKey,
) {
  const scope = await resolveCurrentUserCompanyAccessScope(scopedPermission, globalPermission);
  return scope.isGlobalView || scope.companyIds.includes(companyId);
}
