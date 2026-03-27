import { NextResponse } from "next/server";
import { getProtectedSession } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { buildAddressBookToken } from "@/features/remote/application/address-book-credentials";

function canManageCredentials(role: string) {
  return role === "ADMIN" || role === "SUPORTE" || role === "DEVELOPER";
}

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getProtectedSession();
  if (!session) {
    return NextResponse.json({ success: false, error: "Nao autorizado." }, { status: 401 });
  }
  if (!canManageCredentials(session.role)) {
    return NextResponse.json({ success: false, error: "Acesso negado." }, { status: 403 });
  }

  const { id } = await context.params;
  const current = await prisma.remoteAddressBookCredential.findUnique({
    where: { id },
  });
  if (!current) {
    return NextResponse.json({ success: false, error: "Credencial nao encontrada." }, { status: 404 });
  }

  const now = new Date();
  const { token, tokenHash, tokenPreview } = buildAddressBookToken();
  const rotated = await prisma.$transaction(async (tx) => {
    await tx.remoteAddressBookCredential.update({
      where: { id: current.id },
      data: {
        status: "REVOKED",
        revokedAt: now,
        rotatedByUserId: session.userId,
      },
    });

    return tx.remoteAddressBookCredential.create({
      data: {
        label: current.label,
        integrationKey: current.integrationKey,
        scope: current.scope,
        companyId: current.companyId,
        tokenHash,
        tokenPreview,
        expiresAt: current.expiresAt,
        rotatedFromId: current.id,
        createdByUserId: session.userId,
      },
    });
  });

  return NextResponse.json({
    success: true,
    message: "Credencial rotacionada.",
    data: {
      id: rotated.id,
      token,
      tokenPreview: rotated.tokenPreview,
      scope: rotated.scope,
      companyId: rotated.companyId,
      expiresAt: rotated.expiresAt?.toISOString() ?? null,
    },
  });
}
