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

export async function POST(request: Request) {
  const session = await getProtectedSession();
  if (!session) {
    return remoteErrorResponse({ code: "UNAUTHORIZED", message: "Nao autorizado.", httpStatus: 401 });
  }

  if (!canManageHost(session.role)) {
    return remoteErrorResponse({
      code: "FORBIDDEN",
      message: "Sem permissao para criar host.",
      httpStatus: 403,
    });
  }

  const tenantScope = await getRemoteTenantScope();
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
    const data = await trilinkRemote.createHost({
      scope: {
        isGlobalView: tenantScope.isGlobalView,
        companyIds: tenantScope.companyIds,
      },
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

    return NextResponse.json({ success: true, data: data.host }, { status: 201 });
  } catch (error) {
    return toRemoteDomainErrorResponse(error, {
      validationMessage: "companyId e name sao obrigatorios.",
      defaultMessage: "Falha inesperada ao criar host remoto.",
    });
  }
}

