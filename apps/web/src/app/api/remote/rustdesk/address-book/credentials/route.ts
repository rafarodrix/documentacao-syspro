import { NextResponse } from "next/server";
import { createRemoteAddressBookPort } from "@/features/remote/infrastructure/gateways/remote-domain/address-book-port.gateway";
import { createTrilinkRemote } from "@dosc-syspro/remote-domain";
import { toRemoteDomainErrorResponse } from "@/app/api/remote/_shared/remote-domain-error";
import { requireRemotePermission } from "@/app/api/remote/_shared/remote-access";

export async function GET() {
  const access = await requireRemotePermission("tools:all", "Acesso negado.");
  if (!access.ok) {
    return access.response;
  }

  const addressBookPort = createRemoteAddressBookPort();
  const trilinkRemote = createTrilinkRemote({ addressBookPort });

  try {
    const data = await trilinkRemote.listAddressBookCredentials({});
    return NextResponse.json({ success: true, data: data.credentials });
  } catch (error) {
    return toRemoteDomainErrorResponse(error, {
      defaultMessage: "Falha inesperada ao listar credenciais.",
    });
  }
}

export async function POST(request: Request) {
  const access = await requireRemotePermission("tools:all", "Acesso negado.");
  if (!access.ok) {
    return access.response;
  }
  const session = access.session;

  const body = await request.json().catch(() => null);

  const addressBookPort = createRemoteAddressBookPort();
  const trilinkRemote = createTrilinkRemote({ addressBookPort });

  try {
    const data = await trilinkRemote.createAddressBookCredential({
      label: typeof body?.label === "string" ? body.label.trim() : "",
      integrationKey: typeof body?.integrationKey === "string" ? body.integrationKey : null,
      scope: body?.scope === "COMPANY" ? "COMPANY" : "GLOBAL",
      companyId: typeof body?.companyId === "string" ? body.companyId.trim() : null,
      expiresInDays: Number.isFinite(Number(body?.expiresInDays)) ? Number(body.expiresInDays) : null,
      actorUserId: session.userId,
    });

    return NextResponse.json({
      success: true,
      message: "Credencial criada.",
      data: data.credential,
    });
  } catch (error) {
    return toRemoteDomainErrorResponse(error, {
      validationMessage: "Informe o label da credencial.",
      defaultMessage: "Falha inesperada ao criar credencial.",
    });
  }
}

