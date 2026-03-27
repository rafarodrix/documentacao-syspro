import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getProtectedSession } from "@/lib/auth-helpers";
import { createRemoteAddressBookPort } from "@/features/remote/infrastructure/gateways/remote-domain/address-book-port.gateway";
import { createTrilinkRemote } from "@dosc-syspro/remote-domain";

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

  const addressBookPort = createRemoteAddressBookPort();
  const trilinkRemote = createTrilinkRemote({ addressBookPort });

  try {
    const data = await trilinkRemote.rotateAddressBookCredential({
      credentialId: id,
      actorUserId: session.userId,
    });

    return NextResponse.json({
      success: true,
      message: "Credencial rotacionada.",
      data: data.credential,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ success: false, error: "Credencial invalida." }, { status: 400 });
    }

    if (error instanceof Error && error.message === "ADDRESS_BOOK_CREDENTIAL_NOT_FOUND") {
      return NextResponse.json({ success: false, error: "Credencial nao encontrada." }, { status: 404 });
    }

    return NextResponse.json({ success: false, error: "Falha inesperada ao rotacionar credencial." }, { status: 500 });
  }
}
