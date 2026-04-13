import "server-only";

import { prisma } from "@/lib/prisma";
import { getRemoteTenantScope } from "@/features/remote/application/scope";
import { createRemoteHostAdminPort } from "@/features/remote/infrastructure/gateways/remote-domain/host-admin-port.gateway";
import { createTrilinkRemote } from "@dosc-syspro/remote-domain";

export type HostRemoteAction = "REBOOTSTRAP" | "RESEND_CONFIG" | "REAPPLY_ALIAS";

export function parseRequestedHostRemoteAction(body: unknown): HostRemoteAction | null {
  if (!body || typeof body !== "object") return null;
  const value = "action" in body ? (body as { action?: unknown }).action : null;
  if (value === "REBOOTSTRAP" || value === "RESEND_CONFIG" || value === "REAPPLY_ALIAS") {
    return value;
  }
  return null;
}

export async function ensureRemoteHostIsInTenantScope(hostId: string) {
  const tenantScope = await getRemoteTenantScope();
  const host = await prisma.remoteHost.findFirst({
    where: tenantScope.isGlobalView
      ? { id: hostId }
      : { id: hostId, companyId: { in: tenantScope.companyIds.length ? tenantScope.companyIds : ["__none__"] } },
    select: { id: true, name: true },
  });

  return {
    host,
    tenantScope,
  };
}

export async function requestRemoteHostRebootstrap(hostId: string) {
  const { host, tenantScope } = await ensureRemoteHostIsInTenantScope(hostId);
  if (!host) {
    return {
      success: false as const,
      code: "NOT_FOUND",
      message: "Host remoto nao encontrado no escopo.",
      httpStatus: 404,
    };
  }

  const hostAdminPort = createRemoteHostAdminPort();
  const trilinkRemote = createTrilinkRemote({ hostAdminPort });
  const data = await trilinkRemote.rotateHostAgentToken({
    scope: {
      isGlobalView: tenantScope.isGlobalView,
      companyIds: tenantScope.companyIds,
    },
    hostId,
  });

  return {
    success: true as const,
    data: data.host,
    message: data.message ?? "Rebootstrap solicitado com sucesso.",
  };
}
