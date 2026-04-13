import { NextResponse } from "next/server";
import { getRemoteTenantScope } from "@/features/remote/application/scope";
import { createRemoteHostAdminPort } from "@/features/remote/infrastructure/gateways/remote-domain/host-admin-port.gateway";
import { createTrilinkRemote } from "@dosc-syspro/remote-domain";
import { toRemoteDomainErrorResponse } from "@/features/remote/application/remote-domain-error";
import { requireRemotePermission } from "@/features/remote/application/remote-access";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireRemotePermission("tools:all", "Sem permissao para vincular maquina descoberta.");
  if (!access.ok) {
    return access.response;
  }

  const tenantScope = await getRemoteTenantScope();
  const { id } = await params;
  const body = (await request.json()) as { companyId?: string; name?: string; description?: string | null };

  const hostAdminPort = createRemoteHostAdminPort();
  const trilinkRemote = createTrilinkRemote({ hostAdminPort });

  try {
    const data = await trilinkRemote.linkDiscoveredHost({
      scope: {
        isGlobalView: tenantScope.isGlobalView,
        companyIds: tenantScope.companyIds,
      },
      discoveredHostId: id,
      companyId: body.companyId,
      name: body.name,
      description: body.description ?? null,
    });

    return NextResponse.json(
      { success: true, data: { hostId: data.hostId, discoveredHostId: data.discoveredHostId } },
      { status: data.created ? 201 : 200 },
    );
  } catch (error) {
    return toRemoteDomainErrorResponse(error, {
      validationMessage: "companyId e name sao obrigatorios.",
      defaultMessage: "Falha inesperada ao vincular maquina descoberta.",
    });
  }
}

