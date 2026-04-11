import { NextResponse } from "next/server";
import { createRemoteAddressBookPort } from "@/features/remote/infrastructure/gateways/remote-domain/address-book-port.gateway";
import { createTrilinkRemote } from "@dosc-syspro/remote-domain";
import { toRemoteDomainErrorResponse } from "@/app/api/remote/_shared/remote-domain-error";
import { requireRemotePermission } from "@/app/api/remote/_shared/remote-access";

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

