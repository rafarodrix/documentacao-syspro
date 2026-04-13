import { NextResponse } from "next/server";
import { getRemoteTenantScope } from "@/features/remote/application/scope";
import { createRemoteHostAdminPort } from "@/features/remote/infrastructure/gateways/remote-domain/host-admin-port.gateway";
import { createTrilinkRemote } from "@dosc-syspro/remote-domain";
import { toRemoteDomainErrorResponse } from "@/features/remote/application/remote-domain-error";
import { requireRemotePermission } from "@/features/remote/application/remote-access";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; updateId: string }> }) {
  const access = await requireRemotePermission("tools:all", "Sem permissao para vincular instalacoes.");
  if (!access.ok) {
    return access.response;
  }

  const tenantScope = await getRemoteTenantScope();
  const { id, updateId } = await params;
  const body = (await request.json()) as { companyId?: string | null; mode?: "replace" | "add" };

  const hostAdminPort = createRemoteHostAdminPort();
  const trilinkRemote = createTrilinkRemote({ hostAdminPort });

  try {
    const data = await trilinkRemote.relinkHostSysproUpdate({
      scope: {
        isGlobalView: tenantScope.isGlobalView,
        companyIds: tenantScope.companyIds,
      },
      hostId: id,
      updateId,
      companyId: body.companyId ?? null,
      mode: body.mode,
    });

    return NextResponse.json({ success: true, data: data.update });
  } catch (error) {
    return toRemoteDomainErrorResponse(error, {
      validationMessage: "Payload de vinculacao invalido.",
      defaultMessage: "Falha inesperada ao vincular instalacao.",
    });
  }
}

