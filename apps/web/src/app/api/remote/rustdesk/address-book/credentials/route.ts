import { NextResponse } from "next/server";
import { getProtectedSession } from "@/lib/auth-helpers";
import { createRemoteAddressBookPort } from "@/features/remote/infrastructure/gateways/remote-domain/address-book-port.gateway";
import { createTrilinkRemote } from "@dosc-syspro/remote-domain";
import { remoteErrorResponse, toRemoteDomainErrorResponse } from "@/app/api/remote/_shared/remote-domain-error";

function canManageCredentials(role: string) {
  return role === "ADMIN" || role === "SUPORTE" || role === "DEVELOPER";
}

export async function GET() {
  const session = await getProtectedSession();
  if (!session) {
    return remoteErrorResponse({ code: "UNAUTHORIZED", message: "Nao autorizado.", httpStatus: 401 });
  }
  if (!canManageCredentials(session.role)) {
    return remoteErrorResponse({ code: "FORBIDDEN", message: "Acesso negado.", httpStatus: 403 });
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
  const session = await getProtectedSession();
  if (!session) {
    return remoteErrorResponse({ code: "UNAUTHORIZED", message: "Nao autorizado.", httpStatus: 401 });
  }
  if (!canManageCredentials(session.role)) {
    return remoteErrorResponse({ code: "FORBIDDEN", message: "Acesso negado.", httpStatus: 403 });
  }

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

