import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getProtectedSession } from "@/lib/auth-helpers";
import { getRemoteTenantScope } from "@/features/remote/application/scope";
import { createRemoteHostAdminPort } from "@/features/remote/infrastructure/gateways/remote-domain/host-admin-port.gateway";
import { createTrilinkRemote } from "@dosc-syspro/remote-domain";

export const dynamic = "force-dynamic";

function canManageHost(role: string): boolean {
  return role === "ADMIN" || role === "SUPORTE" || role === "DEVELOPER";
}

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getProtectedSession();
  if (!session) {
    return NextResponse.json({ success: false, error: "Nao autorizado." }, { status: 401 });
  }

  if (!canManageHost(session.role)) {
    return NextResponse.json({ success: false, error: "Sem permissao para rotacionar agentToken." }, { status: 403 });
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
    if (error instanceof ZodError) {
      return NextResponse.json({ success: false, error: "Host remoto invalido." }, { status: 400 });
    }

    if (error instanceof Error && error.message === "HOST_NOT_FOUND") {
      return NextResponse.json({ success: false, error: "Host remoto nao encontrado." }, { status: 404 });
    }

    if (error instanceof Error && error.message === "HOST_AGENT_TOKEN_NOT_ACTIVE") {
      return NextResponse.json(
        { success: false, error: "Este host ainda nao possui agentToken ativo para rotacionar." },
        { status: 409 },
      );
    }

    return NextResponse.json({ success: false, error: "Falha inesperada ao rotacionar agentToken." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getProtectedSession();
  if (!session) {
    return NextResponse.json({ success: false, error: "Nao autorizado." }, { status: 401 });
  }

  if (!canManageHost(session.role)) {
    return NextResponse.json({ success: false, error: "Sem permissao para revogar agentToken." }, { status: 403 });
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
    if (error instanceof ZodError) {
      return NextResponse.json({ success: false, error: "Host remoto invalido." }, { status: 400 });
    }

    if (error instanceof Error && error.message === "HOST_NOT_FOUND") {
      return NextResponse.json({ success: false, error: "Host remoto nao encontrado." }, { status: 404 });
    }

    if (error instanceof Error && error.message === "HOST_AGENT_TOKEN_NOT_ACTIVE") {
      return NextResponse.json(
        { success: false, error: "Este host ainda nao possui agentToken ativo." },
        { status: 409 },
      );
    }

    return NextResponse.json({ success: false, error: "Falha inesperada ao revogar agentToken." }, { status: 500 });
  }
}
