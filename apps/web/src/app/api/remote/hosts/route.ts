import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { getProtectedSession } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { getRemoteTenantScope } from "@/features/remote/application/scope";

export const dynamic = "force-dynamic";

function canCreateHost(role: string): boolean {
  return role === "ADMIN" || role === "SUPORTE" || role === "DEVELOPER";
}

function buildInstallToken() {
  return `rhost_${randomBytes(12).toString("hex")}`;
}

function normalizeRustdeskId(value?: string | null) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return trimmed.replace(/\s+/g, "");
}

export async function GET() {
  const session = await getProtectedSession();
  if (!session) {
    return NextResponse.json({ success: false, error: "Nao autorizado." }, { status: 401 });
  }

  const tenantScope = await getRemoteTenantScope();
  const where = tenantScope.isGlobalView
    ? {}
    : { companyId: { in: tenantScope.companyIds.length ? tenantScope.companyIds : ["__none__"] } };

  const hosts = await prisma.remoteHost.findMany({
    where,
    include: {
      company: { select: { id: true, nomeFantasia: true, razaoSocial: true } },
    },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ success: true, data: hosts, tenantScope });
}

export async function POST(request: Request) {
  const session = await getProtectedSession();
  if (!session) {
    return NextResponse.json({ success: false, error: "Nao autorizado." }, { status: 401 });
  }

  if (!canCreateHost(session.role)) {
    return NextResponse.json({ success: false, error: "Sem permissao para cadastrar host." }, { status: 403 });
  }

  const body = (await request.json()) as {
    companyId?: string;
    name?: string;
    environment?: string | null;
    provider?: string | null;
    description?: string | null;
    notes?: string | null;
    agentExternalId?: string | null;
    status?: "ACTIVE" | "INACTIVE" | "MAINTENANCE";
  };

  const companyId = body.companyId?.trim();
  const name = body.name?.trim();

  if (!companyId || !name) {
    return NextResponse.json({ success: false, error: "companyId e name sao obrigatorios." }, { status: 400 });
  }

  const company = await prisma.company.findFirst({
    where: { id: companyId, deletedAt: null },
    select: { id: true },
  });

  if (!company) {
    return NextResponse.json({ success: false, error: "Empresa nao encontrada." }, { status: 404 });
  }

  const host = await prisma.remoteHost.create({
    data: {
      companyId,
      name,
      environment: body.environment?.trim() || null,
      provider: body.provider?.trim() || null,
      description: body.description?.trim() || null,
      notes: body.notes?.trim() || null,
      agentExternalId: normalizeRustdeskId(body.agentExternalId),
      installToken: buildInstallToken(),
      status: body.status ?? "ACTIVE",
    },
  });

  return NextResponse.json({ success: true, data: host }, { status: 201 });
}
