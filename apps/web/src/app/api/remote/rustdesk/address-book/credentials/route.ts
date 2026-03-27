import { NextResponse } from "next/server";
import { getProtectedSession } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { buildAddressBookToken } from "@/features/remote/application/address-book-credentials";

function canManageCredentials(role: string) {
  return role === "ADMIN" || role === "SUPORTE" || role === "DEVELOPER";
}

function normalizeIntegrationKey(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);
}

export async function GET() {
  const session = await getProtectedSession();
  if (!session) {
    return NextResponse.json({ success: false, error: "Nao autorizado." }, { status: 401 });
  }
  if (!canManageCredentials(session.role)) {
    return NextResponse.json({ success: false, error: "Acesso negado." }, { status: 403 });
  }

  const credentials = await prisma.remoteAddressBookCredential.findMany({
    orderBy: [{ createdAt: "desc" }],
    take: 100,
    include: {
      company: {
        select: {
          id: true,
          nomeFantasia: true,
          razaoSocial: true,
        },
      },
      createdByUser: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      rotatedByUser: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      revokedByUser: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return NextResponse.json({
    success: true,
    data: credentials.map((item) => ({
      id: item.id,
      label: item.label,
      integrationKey: item.integrationKey,
      scope: item.scope,
      status: item.status,
      companyId: item.companyId,
      companyName: item.company ? item.company.nomeFantasia ?? item.company.razaoSocial : null,
      tokenPreview: item.tokenPreview,
      expiresAt: item.expiresAt?.toISOString() ?? null,
      lastUsedAt: item.lastUsedAt?.toISOString() ?? null,
      revokedAt: item.revokedAt?.toISOString() ?? null,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
      createdBy: item.createdByUser
        ? {
            id: item.createdByUser.id,
            name: item.createdByUser.name,
            email: item.createdByUser.email,
          }
        : null,
      rotatedBy: item.rotatedByUser
        ? {
            id: item.rotatedByUser.id,
            name: item.rotatedByUser.name,
            email: item.rotatedByUser.email,
          }
        : null,
      revokedBy: item.revokedByUser
        ? {
            id: item.revokedByUser.id,
            name: item.revokedByUser.name,
            email: item.revokedByUser.email,
          }
        : null,
    })),
  });
}

export async function POST(request: Request) {
  const session = await getProtectedSession();
  if (!session) {
    return NextResponse.json({ success: false, error: "Nao autorizado." }, { status: 401 });
  }
  if (!canManageCredentials(session.role)) {
    return NextResponse.json({ success: false, error: "Acesso negado." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const label = typeof body?.label === "string" ? body.label.trim() : "";
  const scope = body?.scope === "COMPANY" ? "COMPANY" : "GLOBAL";
  const companyId = typeof body?.companyId === "string" ? body.companyId.trim() : null;
  const expiresInDaysRaw = Number(body?.expiresInDays ?? 0);

  if (!label) {
    return NextResponse.json({ success: false, error: "Informe o label da credencial." }, { status: 400 });
  }

  if (scope === "COMPANY" && !companyId) {
    return NextResponse.json({ success: false, error: "Selecione a empresa para credencial segmentada." }, { status: 400 });
  }

  if (scope === "COMPANY" && companyId) {
    const company = await prisma.company.findFirst({
      where: { id: companyId, deletedAt: null },
      select: { id: true },
    });
    if (!company) {
      return NextResponse.json({ success: false, error: "Empresa nao encontrada para esta credencial." }, { status: 404 });
    }
  }

  const expiresInDays = Number.isFinite(expiresInDaysRaw) && expiresInDaysRaw > 0 ? Math.floor(expiresInDaysRaw) : null;
  const expiresAt = expiresInDays ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000) : null;
  const integrationKeyBase =
    typeof body?.integrationKey === "string" && body.integrationKey.trim()
      ? body.integrationKey
      : label;
  const integrationKey = normalizeIntegrationKey(integrationKeyBase);
  if (!integrationKey) {
    return NextResponse.json({ success: false, error: "Integration key invalida." }, { status: 400 });
  }

  const { token, tokenHash, tokenPreview } = buildAddressBookToken();
  const created = await prisma.remoteAddressBookCredential.create({
    data: {
      label,
      integrationKey,
      scope,
      companyId: scope === "COMPANY" ? companyId : null,
      tokenHash,
      tokenPreview,
      expiresAt,
      createdByUserId: session.userId,
    },
  });

  return NextResponse.json({
    success: true,
    message: "Credencial criada.",
    data: {
      id: created.id,
      token,
      tokenPreview: created.tokenPreview,
      scope: created.scope,
      companyId: created.companyId,
      expiresAt: created.expiresAt?.toISOString() ?? null,
    },
  });
}
