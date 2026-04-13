import { NextResponse } from "next/server";
import { getRemoteTenantScope } from "@/features/remote/application/scope";
import { createRemoteHostAdminPort } from "@/features/remote/infrastructure/gateways/remote-domain/host-admin-port.gateway";
import { createTrilinkRemote } from "@dosc-syspro/remote-domain";
import { toRemoteDomainErrorResponse } from "@/features/remote/application/remote-domain-error";
import { requireRemotePermission } from "@/features/remote/application/remote-access";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireRemotePermission("tools:all", "Sem permissao para editar host.");
  if (!access.ok) {
    return access.response;
  }

  const tenantScope = await getRemoteTenantScope();
  const { id } = await params;
  const body = (await request.json()) as {
    companyId?: string;
    name?: string;
    machineName?: string | null;
    environment?: string | null;
    provider?: string | null;
    description?: string | null;
    notes?: string | null;
    agentExternalId?: string | null;
    status?: "ACTIVE" | "INACTIVE" | "MAINTENANCE";
  };

  const hostAdminPort = createRemoteHostAdminPort();
  const trilinkRemote = createTrilinkRemote({ hostAdminPort });

  try {
    const data = await trilinkRemote.updateHost({
      scope: {
        isGlobalView: tenantScope.isGlobalView,
        companyIds: tenantScope.companyIds,
      },
      hostId: id,
      companyId: body.companyId,
      name: body.name,
      machineName: body.machineName ?? null,
      environment: body.environment ?? null,
      provider: body.provider ?? null,
      description: body.description ?? null,
      notes: body.notes ?? null,
      agentExternalId: body.agentExternalId ?? null,
      status: body.status,
    });

    return NextResponse.json({ success: true, data: data.host });
  } catch (error) {
    return toRemoteDomainErrorResponse(error, {
      validationMessage: "companyId e name sao obrigatorios.",
      defaultMessage: "Falha inesperada ao atualizar host remoto.",
    });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireRemotePermission("tools:all", "Sem permissao para excluir host.");
  if (!access.ok) {
    return access.response;
  }

  const tenantScope = await getRemoteTenantScope();
  const { id } = await params;

  const hostAdminPort = createRemoteHostAdminPort();
  const trilinkRemote = createTrilinkRemote({ hostAdminPort });

  try {
    await trilinkRemote.deleteHost({
      scope: {
        isGlobalView: tenantScope.isGlobalView,
        companyIds: tenantScope.companyIds,
      },
      hostId: id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return toRemoteDomainErrorResponse(error, {
      validationMessage: "Host remoto invalido.",
      defaultMessage: "Falha inesperada ao excluir host remoto.",
    });
  }
}

