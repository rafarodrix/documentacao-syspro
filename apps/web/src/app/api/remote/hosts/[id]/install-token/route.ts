import { NextResponse } from "next/server";
import { getRemoteTenantScope } from "@/features/remote/application/scope";
import { createRemoteHostAdminPort } from "@/features/remote/infrastructure/gateways/remote-domain/host-admin-port.gateway";
import { createTrilinkRemote } from "@dosc-syspro/remote-domain";
import { toRemoteDomainErrorResponse } from "@/features/remote/application/remote-domain-error";
import { requireRemotePermission } from "@/features/remote/application/remote-access";

export const dynamic = "force-dynamic";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireRemotePermission("tools:all", "Sem permissao para regenerar installToken.");
  if (!access.ok) {
    return access.response;
  }

  const tenantScope = await getRemoteTenantScope();
  const { id } = await params;

  const hostAdminPort = createRemoteHostAdminPort();
  const trilinkRemote = createTrilinkRemote({ hostAdminPort });

  try {
    const data = await trilinkRemote.rotateHostInstallToken({
      scope: {
        isGlobalView: tenantScope.isGlobalView,
        companyIds: tenantScope.companyIds,
      },
      hostId: id,
    });

    return NextResponse.json({ success: true, data: data.host, message: data.message });
  } catch (error) {
    return toRemoteDomainErrorResponse(error, {
      validationMessage: "Host remoto invalido.",
      defaultMessage: "Falha inesperada ao regenerar installToken.",
    });
  }
}
