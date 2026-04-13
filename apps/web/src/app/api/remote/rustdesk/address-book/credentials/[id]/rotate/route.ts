import { NextResponse } from "next/server";
import { createRemoteAddressBookPort } from "@/features/remote/infrastructure/gateways/remote-domain/address-book-port.gateway";
import { createTrilinkRemote } from "@dosc-syspro/remote-domain";
import { toRemoteDomainErrorResponse } from "@/features/remote/application/remote-domain-error";
import { requireRemotePermission } from "@/features/remote/application/remote-access";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const access = await requireRemotePermission("tools:all", "Acesso negado.");
  if (!access.ok) {
    return access.response;
  }
  const session = access.session;

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
    return toRemoteDomainErrorResponse(error, {
      validationMessage: "Credencial invalida.",
      defaultMessage: "Falha inesperada ao rotacionar credencial.",
    });
  }
}

