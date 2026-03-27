import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getProtectedSession } from "@/lib/auth-helpers";
import { getRemoteTenantScope } from "@/features/remote/application/scope";
import { createRemoteHostAdminPort } from "@/features/remote/infrastructure/gateways/remote-domain/host-admin-port.gateway";
import { createTrilinkRemote } from "@dosc-syspro/remote-domain";

export const dynamic = "force-dynamic";

function canRelinkInstallations(role: string) {
  return role === "ADMIN" || role === "SUPORTE" || role === "DEVELOPER";
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; updateId: string }> }) {
  const session = await getProtectedSession();
  if (!session) {
    return NextResponse.json({ success: false, error: "Nao autorizado." }, { status: 401 });
  }

  if (!canRelinkInstallations(session.role)) {
    return NextResponse.json({ success: false, error: "Sem permissao para vincular instalacoes." }, { status: 403 });
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
    if (error instanceof ZodError) {
      return NextResponse.json({ success: false, error: "Payload de vinculacao invalido." }, { status: 400 });
    }

    if (error instanceof Error && error.message === "HOST_NOT_FOUND") {
      return NextResponse.json({ success: false, error: "Host remoto nao encontrado." }, { status: 404 });
    }

    if (error instanceof Error && error.message === "SYSPRO_UPDATE_NOT_FOUND") {
      return NextResponse.json({ success: false, error: "Instalacao monitorada nao encontrada." }, { status: 404 });
    }

    if (error instanceof Error && error.message === "HOST_COMPANY_NOT_FOUND") {
      return NextResponse.json({ success: false, error: "Empresa selecionada nao encontrada no escopo." }, { status: 404 });
    }

    return NextResponse.json({ success: false, error: "Falha inesperada ao vincular instalacao." }, { status: 500 });
  }
}
