import { NextResponse } from "next/server";
import { getProtectedSession } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { getRemoteTenantScope } from "@/features/remote/application/scope";

export const dynamic = "force-dynamic";

function canRelinkInstallations(role: string) {
  return role === "ADMIN" || role === "SUPORTE" || role === "DEVELOPER";
}

function buildScopedWhere(companyIds: string[], isGlobalView: boolean) {
  return isGlobalView ? {} : { companyId: { in: companyIds.length ? companyIds : ["__none__"] } };
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; updateId: string }> }
) {
  const session = await getProtectedSession();
  if (!session) {
    return NextResponse.json({ success: false, error: "Nao autorizado." }, { status: 401 });
  }

  if (!canRelinkInstallations(session.role)) {
    return NextResponse.json({ success: false, error: "Sem permissao para vincular instalacoes." }, { status: 403 });
  }

  const tenantScope = await getRemoteTenantScope();
  const { id, updateId } = await params;
  const body = (await request.json()) as { companyId?: string | null };
  const scopedWhere = buildScopedWhere(tenantScope.companyIds, tenantScope.isGlobalView);

  const host = await prisma.remoteHost.findFirst({
    where: {
      id,
      ...scopedWhere,
    },
    select: { id: true },
  });

  if (!host) {
    return NextResponse.json({ success: false, error: "Host remoto nao encontrado." }, { status: 404 });
  }

  const update = await prisma.remoteHostSysproUpdate.findFirst({
    where: {
      id: updateId,
      hostId: id,
    },
    select: { id: true, companyLabel: true },
  });

  if (!update) {
    return NextResponse.json({ success: false, error: "Instalacao monitorada nao encontrada." }, { status: 404 });
  }

  let nextCompanyId: string | null = null;
  if (body.companyId?.trim()) {
    const company = await prisma.company.findFirst({
      where: {
        id: body.companyId.trim(),
        deletedAt: null,
        ...(tenantScope.isGlobalView ? {} : { id: { in: tenantScope.companyIds.length ? tenantScope.companyIds : ["__none__"] } }),
      },
      select: { id: true },
    });

    if (!company) {
      return NextResponse.json({ success: false, error: "Empresa selecionada nao encontrada no escopo." }, { status: 404 });
    }

    nextCompanyId = company.id;
  }

  const saved = await prisma.remoteHostSysproUpdate.update({
    where: { id: updateId },
    data: {
      companyId: nextCompanyId,
    },
    select: {
      id: true,
      companyId: true,
      companyLabel: true,
      path: true,
    },
  });

  return NextResponse.json({ success: true, data: saved });
}