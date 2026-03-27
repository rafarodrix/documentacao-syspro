import { NextResponse } from "next/server";
import { getProtectedSession } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { getRemoteTenantScope } from "@/features/remote/application/scope";
import { resolveRustDeskAlias } from "@/features/remote/application/rustdesk-sync";
import { resolveAddressBookCredentialFromRequest } from "@/features/remote/application/address-book-credentials";

export const dynamic = "force-dynamic";

function buildScopedWhere(companyIds: string[], isGlobalView: boolean) {
  return isGlobalView ? {} : { companyId: { in: companyIds.length ? companyIds : ["__none__"] } };
}

export async function GET(request: Request) {
  const session = await getProtectedSession();
  const credential = await resolveAddressBookCredentialFromRequest(request);
  const hasCredentialAccess = !!credential;
  if (!session && !hasCredentialAccess) {
    return NextResponse.json({ success: false, error: "Nao autorizado." }, { status: 401 });
  }

  const tenantScope = hasCredentialAccess
    ? credential.scope === "GLOBAL"
      ? {
          role: "DEVELOPER" as const,
          isGlobalView: true,
          companyIds: [],
          companyCount: 0,
          summary: "Address book liberado por credencial global.",
        }
      : {
          role: "CLIENTE_ADMIN" as const,
          isGlobalView: false,
          companyIds: credential.companyId ? [credential.companyId] : [],
          companyCount: credential.companyId ? 1 : 0,
          summary: "Address book liberado por credencial segmentada por empresa.",
        }
    : await getRemoteTenantScope();
  const scopedWhere = buildScopedWhere(tenantScope.companyIds, tenantScope.isGlobalView);
  const hosts = await prisma.remoteHost.findMany({
    where: scopedWhere,
    include: {
      company: {
        select: {
          nomeFantasia: true,
          razaoSocial: true,
        },
      },
      sysproUpdates: {
        select: {
          companyLabel: true,
        },
      },
    },
    orderBy: [{ updatedAt: "desc" }],
    take: 500,
  });

  const items = hosts
    .filter((host) => !!host.agentExternalId)
    .map((host) => {
      const alias = resolveRustDeskAlias({
        hostName: host.name,
        machineName: host.machineName,
        companyName: host.company.nomeFantasia ?? host.company.razaoSocial,
      });
      const companyName = host.company.nomeFantasia ?? host.company.razaoSocial;
      const tags = Array.from(
        new Set(
          [
            `Empresa: ${companyName}`,
            host.environment ? `Ambiente: ${host.environment}` : null,
            host.provider ? `Provider: ${host.provider}` : null,
            ...host.sysproUpdates.map((item) => `Instalacao: ${item.companyLabel}`),
          ].filter((entry): entry is string => !!entry)
        )
      );

      return {
        id: host.agentExternalId,
        alias,
        hostname: host.machineName,
        tags,
        hash: host.updatedAt.getTime().toString(),
        portalHostId: host.id,
        companyId: host.companyId,
        lastHeartbeatAt: host.lastHeartbeatAt?.toISOString() ?? null,
      };
    });

  return NextResponse.json({
    success: true,
    data: {
      items,
      total: items.length,
    },
  });
}
