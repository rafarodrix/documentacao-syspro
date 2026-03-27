import { NextResponse } from "next/server";
import { getProtectedSession } from "@/lib/auth-helpers";
import { getRemoteTenantScope } from "@/features/remote/application/scope";
import { createRemoteHostAdminPort } from "@/features/remote/infrastructure/gateways/remote-domain/host-admin-port.gateway";
import { createTrilinkRemote } from "@dosc-syspro/remote-domain";
import { remoteErrorResponse, toRemoteDomainErrorResponse } from "@/app/api/remote/_shared/remote-domain-error";

export const dynamic = "force-dynamic";

function canManageHost(role: string): boolean {
  return role === "ADMIN" || role === "SUPORTE" || role === "DEVELOPER";
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getProtectedSession();
  if (!session) {
    return remoteErrorResponse({ code: "UNAUTHORIZED", message: "Nao autorizado.", httpStatus: 401 });
  }

  if (!canManageHost(session.role)) {
    return remoteErrorResponse({
      code: "FORBIDDEN",
      message: "Sem permissao para vincular maquina descoberta.",
      httpStatus: 403,
    });
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

