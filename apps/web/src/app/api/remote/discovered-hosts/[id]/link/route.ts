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

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getProtectedSession();
  if (!session) {
    return NextResponse.json({ success: false, error: "Nao autorizado." }, { status: 401 });
  }

  if (!canManageHost(session.role)) {
    return NextResponse.json({ success: false, error: "Sem permissao para vincular maquina descoberta." }, { status: 403 });
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
    if (error instanceof ZodError) {
      return NextResponse.json({ success: false, error: "companyId e name sao obrigatorios." }, { status: 400 });
    }

    if (error instanceof Error && error.message === "HOST_COMPANY_OUT_OF_SCOPE") {
      return NextResponse.json({ success: false, error: "Empresa fora do escopo remoto do usuario." }, { status: 403 });
    }

    if (error instanceof Error && error.message === "HOST_COMPANY_NOT_FOUND") {
      return NextResponse.json({ success: false, error: "Empresa nao encontrada." }, { status: 404 });
    }

    if (error instanceof Error && error.message === "DISCOVERED_HOST_NOT_FOUND") {
      return NextResponse.json({ success: false, error: "Maquina descoberta nao encontrada." }, { status: 404 });
    }

    return NextResponse.json({ success: false, error: "Falha inesperada ao vincular maquina descoberta." }, { status: 500 });
  }
}
