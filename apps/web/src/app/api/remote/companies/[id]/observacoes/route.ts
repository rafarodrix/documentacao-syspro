import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRemoteTenantScope } from "@/features/remote/application/scope";
import { remoteErrorResponse } from "@/app/api/remote/_shared/remote-domain-error";
import { requireRemotePermission } from "@/app/api/remote/_shared/remote-access";

export const dynamic = "force-dynamic";

function buildScopedWhere(companyIds: string[], isGlobalView: boolean) {
  return isGlobalView ? {} : { id: { in: companyIds.length ? companyIds : ["__none__"] } };
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireRemotePermission(
    "companies:edit",
    "Sem permissao para editar observacoes da empresa.",
    { acceptCompanyScope: true },
  );
  if (!access.ok) {
    return access.response;
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
    return remoteErrorResponse({ code: "COMPANY_NOT_FOUND", message: "Empresa nao encontrada.", httpStatus: 404 });
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
