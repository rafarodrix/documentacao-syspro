import { NextResponse } from "next/server";
import { getProtectedSession } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { getRemoteTenantScope } from "@/features/remote/application/scope";

export const dynamic = "force-dynamic";

function canManageHost(role: string): boolean {
  return role === "ADMIN" || role === "SUPORTE" || role === "DEVELOPER";
}

function normalizeRustdeskId(value?: string | null) {
  const digitsOnly = (value ?? "").replace(/\D/g, "").trim();
  if (!digitsOnly) return null;
  return /^\d{7,12}$/.test(digitsOnly) ? digitsOnly : null;
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

  const companyId = body.companyId?.trim();
  const name = body.name?.trim();

  if (!companyId || !name) {
    return NextResponse.json({ success: false, error: "companyId e name sao obrigatorios." }, { status: 400 });
  }

  if (!tenantScope.isGlobalView && !tenantScope.companyIds.includes(companyId)) {
    return NextResponse.json({ success: false, error: "Empresa fora do escopo remoto do usuario." }, { status: 403 });
  }

  const company = await prisma.company.findFirst({
    where: {
      id: companyId,
      deletedAt: null,
    },
    select: { id: true },
  });

  if (!company) {
    return NextResponse.json({ success: false, error: "Empresa nao encontrada." }, { status: 404 });
  }

  const agentExternalId = normalizeRustdeskId(body.agentExternalId);
  if (body.agentExternalId?.trim() && !agentExternalId) {
    return NextResponse.json({ success: false, error: "RustDesk ID invalido. Informe apenas numeros com 7 a 12 digitos." }, { status: 400 });
  }

  if (agentExternalId) {
    const existingHost = await prisma.remoteHost.findFirst({
      where: {
        agentExternalId,
      },
      select: {
        id: true,
        company: {
          select: {
            nomeFantasia: true,
            razaoSocial: true,
          },
        },
      },
    });

    if (existingHost) {
      const companyLabel = existingHost.company.nomeFantasia ?? existingHost.company.razaoSocial ?? "empresa";
      return NextResponse.json(
        {
          success: false,
          error: `Ja existe um host remoto com este RustDesk ID vinculado a ${companyLabel}.`,
        },
        { status: 409 }
      );
    }
  }

  const host = await prisma.remoteHost.create({
    data: {
      companyId,
      name,
      machineName: body.machineName?.trim() || null,
      environment: body.environment?.trim() || null,
      provider: body.provider?.trim() || "RustDesk",
      description: body.description?.trim() || null,
      notes: body.notes?.trim() || null,
      agentExternalId,
      status: body.status ?? "ACTIVE",
    },
  });

  return NextResponse.json({ success: true, data: host }, { status: 201 });
}
