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

export async function POST(request: Request) {
  const session = await getProtectedSession();
  if (!session) {
    return NextResponse.json({ success: false, error: "Nao autorizado." }, { status: 401 });
  }

  if (!canManageHost(session.role)) {
    return NextResponse.json({ success: false, error: "Sem permissao para criar host." }, { status: 403 });
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
    if (error instanceof ZodError) {
      return NextResponse.json({ success: false, error: "companyId e name sao obrigatorios." }, { status: 400 });
    }

    if (error instanceof Error && error.message === "HOST_COMPANY_OUT_OF_SCOPE") {
      return NextResponse.json({ success: false, error: "Empresa fora do escopo remoto do usuario." }, { status: 403 });
    }

    if (error instanceof Error && error.message === "HOST_COMPANY_NOT_FOUND") {
      return NextResponse.json({ success: false, error: "Empresa nao encontrada." }, { status: 404 });
    }

    if (error instanceof Error && error.message === "HOST_AGENT_EXTERNAL_ID_INVALID") {
      return NextResponse.json(
        { success: false, error: "RustDesk ID invalido. Informe apenas numeros com 7 a 12 digitos." },
        { status: 400 },
      );
    }

    if (error instanceof Error && error.message === "HOST_AGENT_EXTERNAL_ID_CONFLICT") {
      const data = (error as Error & { data?: { companyLabel?: string } }).data;
      const companyLabel = data?.companyLabel ?? "empresa";
      return NextResponse.json(
        { success: false, error: `Ja existe um host remoto com este RustDesk ID vinculado a ${companyLabel}.` },
        { status: 409 },
      );
    }

    return NextResponse.json({ success: false, error: "Falha inesperada ao criar host remoto." }, { status: 500 });
  }
}
