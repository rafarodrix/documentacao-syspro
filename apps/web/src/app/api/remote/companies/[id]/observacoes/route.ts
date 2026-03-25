import { NextResponse } from "next/server";
import { getProtectedSession } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { getRemoteTenantScope } from "@/features/remote/application/scope";

export const dynamic = "force-dynamic";

function canEditCompanyObservacoes(role: string) {
  return role === "ADMIN" || role === "SUPORTE" || role === "DEVELOPER" || role === "CLIENTE_ADMIN";
}

function buildScopedWhere(companyIds: string[], isGlobalView: boolean) {
  return isGlobalView ? {} : { id: { in: companyIds.length ? companyIds : ["__none__"] } };
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getProtectedSession();
  if (!session) {
    return NextResponse.json({ success: false, error: "Nao autorizado." }, { status: 401 });
  }

  if (!canEditCompanyObservacoes(session.role)) {
    return NextResponse.json({ success: false, error: "Sem permissao para editar observacoes da empresa." }, { status: 403 });
  }

  const tenantScope = await getRemoteTenantScope();
  const { id } = await params;
  const body = (await request.json()) as { observacoes?: string | null };
  const scopedWhere = buildScopedWhere(tenantScope.companyIds, tenantScope.isGlobalView);

  const company = await prisma.company.findFirst({
    where: {
      id,
      deletedAt: null,
      ...scopedWhere,
    },
    select: { id: true },
  });

  if (!company) {
    return NextResponse.json({ success: false, error: "Empresa nao encontrada." }, { status: 404 });
  }

  const updated = await prisma.company.update({
    where: { id },
    data: {
      observacoes: body.observacoes?.trim() || null,
    },
    select: {
      id: true,
      observacoes: true,
    },
  });

  return NextResponse.json({ success: true, data: updated });
}
