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

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getProtectedSession();
  if (!session) {
    return remoteErrorResponse({ code: "UNAUTHORIZED", message: "Nao autorizado.", httpStatus: 401 });
  }

  if (!canManageHost(session.role)) {
    return remoteErrorResponse({
      code: "FORBIDDEN",
      message: "Sem permissao para rotacionar agentToken.",
      httpStatus: 403,
    });
  }

  const tenantScope = await getRemoteTenantScope();
  const { id } = await params;

  const hostAdminPort = createRemoteHostAdminPort();
  const trilinkRemote = createTrilinkRemote({ hostAdminPort });

  try {
    const data = await trilinkRemote.rotateHostAgentToken({
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
      defaultMessage: "Falha inesperada ao rotacionar agentToken.",
    });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getProtectedSession();
  if (!session) {
    return remoteErrorResponse({ code: "UNAUTHORIZED", message: "Nao autorizado.", httpStatus: 401 });
  }

  if (!canManageHost(session.role)) {
    return remoteErrorResponse({
      code: "FORBIDDEN",
      message: "Sem permissao para revogar agentToken.",
      httpStatus: 403,
    });
  }

  const tenantScope = await getRemoteTenantScope();
  const { id } = await params;

  const hostAdminPort = createRemoteHostAdminPort();
  const trilinkRemote = createTrilinkRemote({ hostAdminPort });

  try {
    const data = await trilinkRemote.revokeHostAgentToken({
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
      defaultMessage: "Falha inesperada ao revogar agentToken.",
    });
  }
}

