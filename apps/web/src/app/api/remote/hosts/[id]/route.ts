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

function normalizeRustdeskId(value?: string | null) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return trimmed.replace(/\s+/g, "");
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getProtectedSession();
  if (!session) {
    return NextResponse.json({ success: false, error: "Nao autorizado." }, { status: 401 });
  }

  if (!canManageHost(session.role)) {
    return NextResponse.json({ success: false, error: "Sem permissao para editar host." }, { status: 403 });
  }

  const tenantScope = await getRemoteTenantScope();
  const { id } = await params;
  const body = (await request.json()) as {
    companyId?: string;
    name?: string;
    environment?: string | null;
    provider?: string | null;
    description?: string | null;
    agentExternalId?: string | null;
    status?: "ACTIVE" | "INACTIVE" | "MAINTENANCE";
  };

  const companyId = body.companyId?.trim();
  const name = body.name?.trim();

  if (!companyId || !name) {
    return NextResponse.json({ success: false, error: "companyId e name sao obrigatorios." }, { status: 400 });
  }

  const scopedWhere = buildScopedWhere(tenantScope.companyIds, tenantScope.isGlobalView);
  const existingHost = await prisma.remoteHost.findFirst({
    where: {
      id,
      ...scopedWhere,
    },
    select: { id: true },
  });

  if (!existingHost) {
    return NextResponse.json({ success: false, error: "Host remoto nao encontrado." }, { status: 404 });
  }

  const company = await prisma.company.findFirst({
    where: { id: companyId, deletedAt: null },
    select: { id: true },
  });

  if (!company) {
    return NextResponse.json({ success: false, error: "Empresa nao encontrada." }, { status: 404 });
  }

  const host = await prisma.remoteHost.update({
    where: { id },
    data: {
      companyId,
      name,
      environment: body.environment?.trim() || null,
      provider: body.provider?.trim() || null,
      description: body.description?.trim() || null,
      agentExternalId: normalizeRustdeskId(body.agentExternalId),
      status: body.status ?? "ACTIVE",
    },
  });

  return NextResponse.json({ success: true, data: host });
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
    return NextResponse.json({ success: false, error: "Sem permissao para excluir host." }, { status: 403 });
  }

  const tenantScope = await getRemoteTenantScope();
  const { id } = await params;
  const scopedWhere = buildScopedWhere(tenantScope.companyIds, tenantScope.isGlobalView);

  const existingHost = await prisma.remoteHost.findFirst({
    where: {
      id,
      ...scopedWhere,
    },
    include: {
      sessions: {
        where: {
          status: { in: ["REQUESTED", "STARTED"] },
        },
        select: { id: true },
        take: 1,
      },
    },
  });

  if (!existingHost) {
    return NextResponse.json({ success: false, error: "Host remoto nao encontrado." }, { status: 404 });
  }

  if (existingHost.sessions.length) {
    return NextResponse.json(
      { success: false, error: "Host possui sessao remota aberta e nao pode ser excluido." },
      { status: 409 }
    );
  }

  await prisma.remoteHost.delete({
    where: { id },
  });

  return NextResponse.json({ success: true });
}
