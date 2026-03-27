import { NextResponse } from "next/server";
import { getProtectedSession } from "@/lib/auth-helpers";
import { getRemoteTenantScope } from "@/features/remote/application/scope";
import { createRemoteHostAdminPort } from "@/features/remote/infrastructure/gateways/remote-domain/host-admin-port.gateway";
import { createTrilinkRemote } from "@dosc-syspro/remote-domain";
import { remoteErrorResponse, toRemoteDomainErrorResponse } from "@/app/api/remote/_shared/remote-domain-error";

export const dynamic = "force-dynamic";

function canRelinkInstallations(role: string) {
  return role === "ADMIN" || role === "SUPORTE" || role === "DEVELOPER";
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; updateId: string }> }) {
  const session = await getProtectedSession();
  if (!session) {
    return remoteErrorResponse({ code: "UNAUTHORIZED", message: "Nao autorizado.", httpStatus: 401 });
  }

  if (!canRelinkInstallations(session.role)) {
    return remoteErrorResponse({
      code: "FORBIDDEN",
      message: "Sem permissao para vincular instalacoes.",
      httpStatus: 403,
    });
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

