import { buildScopedWhere } from "@dosc-syspro/database";
import type { RemoteTenantScope } from "./remote-admin.types";

export function getScopedCompanyIds(tenantScope: RemoteTenantScope) {
  return tenantScope.companyIds.length ? tenantScope.companyIds : ["__none__"];
}

export function buildRemoteScopedWhere(tenantScope: RemoteTenantScope) {
  return buildScopedWhere(tenantScope.companyIds, tenantScope.isGlobalView);
}

export function buildScopedCompanyWhere(tenantScope: RemoteTenantScope) {
  if (tenantScope.isGlobalView) {
    return {};
  }

  return { id: { in: getScopedCompanyIds(tenantScope) } };
}

export function buildScopedHostWhere(tenantScope: RemoteTenantScope, hostId: string) {
  if (tenantScope.isGlobalView) {
    return { id: hostId };
  }

  return {
    id: hostId,
    companyId: { in: getScopedCompanyIds(tenantScope) },
  };
}
