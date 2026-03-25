import { NextResponse } from "next/server";
import { getProtectedSession } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { getRemoteTenantScope } from "@/features/remote/application/scope";

export const dynamic = "force-dynamic";

function canEditCompanyContext(role: string) {
  return role === "ADMIN" || role === "SUPORTE" || role === "DEVELOPER";
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

  if (!canEditCompanyContext(session.role)) {
    return NextResponse.json({ success: false, error: "Sem permissao para editar configuracoes da empresa." }, { status: 403 });
  }

  const tenantScope = await getRemoteTenantScope();
  const { id } = await params;
  const body = (await request.json()) as {
    serverType?: "SYSPRO_SERVER" | "IIS" | null;
    installationDirectory?: string | null;
    serverHost?: string | null;
    serverPort?: number | string | null;
    serverProtocol?: "HTTP" | "HTTPS" | null;
    iisIsapiPath?: string | null;
    observacoes?: string | null;
  };

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

  const serverPortValue =
    body.serverPort === null || body.serverPort === undefined || body.serverPort === ""
      ? null
      : Number(body.serverPort);
  const serverHostValue = body.serverHost?.trim();
  const serverProtocolValue = body.serverProtocol ?? undefined;
  const installationDirectoryValue = body.installationDirectory?.trim();
  const iisIsapiPathValue = body.iisIsapiPath?.trim();
  const observacoesValue = body.observacoes?.trim();

  if (serverPortValue !== null && (!Number.isFinite(serverPortValue) || serverPortValue <= 0)) {
    return NextResponse.json({ success: false, error: "Porta invalida." }, { status: 400 });
  }

  const updated = await prisma.company.update({
    where: { id },
    data: {
      serverType: body.serverType ?? undefined,
      installationDirectory: installationDirectoryValue ? installationDirectoryValue : null,
      serverHost: serverHostValue || "localhost",
      serverPort: serverPortValue ?? undefined,
      serverProtocol: serverProtocolValue,
      iisIsapiPath: iisIsapiPathValue ? iisIsapiPathValue : null,
      observacoes: observacoesValue ? observacoesValue : null,
    },
    select: {
      id: true,
      serverType: true,
      installationDirectory: true,
      serverHost: true,
      serverPort: true,
      serverProtocol: true,
      iisIsapiPath: true,
      observacoes: true,
    },
  });

  return NextResponse.json({ success: true, data: updated });
}
