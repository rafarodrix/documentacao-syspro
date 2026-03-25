import { NextResponse } from "next/server";
import { getProtectedSession } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { getRemoteTenantScope } from "@/features/remote/application/scope";

export const dynamic = "force-dynamic";

function canManageHost(role: string): boolean {
  return role === "ADMIN" || role === "SUPORTE" || role === "DEVELOPER";
}

function buildScopedWhere(companyIds: string[], isGlobalView: boolean) {
  return isGlobalView ? {} : { companyId: { in: companyIds.length ? companyIds : ["__none__"] } };
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getProtectedSession();
  if (!session) {
    return NextResponse.json({ success: false, error: "Nao autorizado." }, { status: 401 });
  }

  if (!canManageHost(session.role)) {
    return NextResponse.json({ success: false, error: "Sem permissao para revogar agentToken." }, { status: 403 });
  }

  const tenantScope = await getRemoteTenantScope();
  const { id } = await params;
  const scopedWhere = buildScopedWhere(tenantScope.companyIds, tenantScope.isGlobalView);

  const existingHost = await prisma.remoteHost.findFirst({
    where: {
      id,
      ...scopedWhere,
    },
    select: {
      id: true,
      name: true,
      agentTokenHash: true,
    },
  });

  if (!existingHost) {
    return NextResponse.json({ success: false, error: "Host remoto nao encontrado." }, { status: 404 });
  }

  if (!existingHost.agentTokenHash) {
    return NextResponse.json(
      { success: false, error: "Este host ainda nao possui agentToken ativo." },
      { status: 409 }
    );
  }

  const host = await prisma.remoteHost.update({
    where: { id },
    data: {
      agentTokenHash: null,
      agentTokenIssuedAt: null,
      agentTokenLastUsedAt: null,
      lastHeartbeatErrorAt: new Date(),
      lastHeartbeatErrorMessage: "agentToken revogado manualmente pelo portal. Executar bootstrap novamente no host.",
    },
    select: {
      id: true,
      name: true,
      agentTokenHash: true,
      lastHeartbeatErrorAt: true,
      lastHeartbeatErrorMessage: true,
    },
  });

  return NextResponse.json({
    success: true,
    data: host,
    message: "agentToken revogado. Execute o bootstrap novamente para emitir nova credencial.",
  });
}
