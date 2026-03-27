import { NextResponse } from "next/server";
import { getProtectedSession } from "@/lib/auth-helpers";
import { createRemoteAddressBookPort } from "@/features/remote/infrastructure/gateways/remote-domain/address-book-port.gateway";
import { createTrilinkRemote } from "@dosc-syspro/remote-domain";
import { remoteErrorResponse, toRemoteDomainErrorResponse } from "@/app/api/remote/_shared/remote-domain-error";

function canManageCredentials(role: string) {
  return role === "ADMIN" || role === "SUPORTE" || role === "DEVELOPER";
}

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getProtectedSession();
  if (!session) {
    return remoteErrorResponse({ code: "UNAUTHORIZED", message: "Nao autorizado.", httpStatus: 401 });
  }
  if (!canManageCredentials(session.role)) {
    return remoteErrorResponse({ code: "FORBIDDEN", message: "Acesso negado.", httpStatus: 403 });
  }

  const { id } = await context.params;

  const addressBookPort = createRemoteAddressBookPort();
  const trilinkRemote = createTrilinkRemote({ addressBookPort });

  try {
    const data = await trilinkRemote.revokeAddressBookCredential({
      credentialId: id,
      actorUserId: session.userId,
    });

    return NextResponse.json({ success: true, message: data.message });
  } catch (error) {
    return toRemoteDomainErrorResponse(error, {
      validationMessage: "Credencial invalida.",
      defaultMessage: "Falha inesperada ao revogar credencial.",
    });
  }
}

