import { NextResponse } from "next/server";
import { getProtectedSession } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

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
  const credential = await prisma.remoteAddressBookCredential.findUnique({
    where: { id },
    select: { id: true, status: true },
  });

  if (!credential) {
    return NextResponse.json({ success: false, error: "Credencial nao encontrada." }, { status: 404 });
  }
  if (credential.status === "REVOKED") {
    return NextResponse.json({ success: true, message: "Credencial ja estava revogada." });
  }

  await prisma.remoteAddressBookCredential.update({
    where: { id: credential.id },
    data: {
      status: "REVOKED",
      revokedAt: new Date(),
      revokedByUserId: session.userId,
    },
  });

  return NextResponse.json({ success: true, message: "Credencial revogada." });
}
