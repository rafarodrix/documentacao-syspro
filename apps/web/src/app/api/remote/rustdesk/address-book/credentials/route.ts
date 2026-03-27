import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getProtectedSession } from "@/lib/auth-helpers";
import { createRemoteAddressBookPort } from "@/features/remote/infrastructure/gateways/remote-domain/address-book-port.gateway";
import { createTrilinkRemote } from "@dosc-syspro/remote-domain";

function canManageCredentials(role: string) {
  return role === "ADMIN" || role === "SUPORTE" || role === "DEVELOPER";
}

export async function GET() {
  const session = await getProtectedSession();
  if (!session) {
    return NextResponse.json({ success: false, error: "Nao autorizado." }, { status: 401 });
  }
  if (!canManageCredentials(session.role)) {
    return NextResponse.json({ success: false, error: "Acesso negado." }, { status: 403 });
  }

  const addressBookPort = createRemoteAddressBookPort();
  const trilinkRemote = createTrilinkRemote({ addressBookPort });

  try {
    const data = await trilinkRemote.listAddressBookCredentials({});
    return NextResponse.json({ success: true, data: data.credentials });
  } catch {
    return NextResponse.json({ success: false, error: "Falha inesperada ao listar credenciais." }, { status: 500 });
  }
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
    if (error instanceof ZodError) {
      return NextResponse.json({ success: false, error: "Informe o label da credencial." }, { status: 400 });
    }

    if (error instanceof Error && error.message === "ADDRESS_BOOK_COMPANY_REQUIRED") {
      return NextResponse.json({ success: false, error: "Selecione a empresa para credencial segmentada." }, { status: 400 });
    }

    if (error instanceof Error && error.message === "ADDRESS_BOOK_COMPANY_NOT_FOUND") {
      return NextResponse.json({ success: false, error: "Empresa nao encontrada para esta credencial." }, { status: 404 });
    }

    if (error instanceof Error && error.message === "ADDRESS_BOOK_INTEGRATION_KEY_INVALID") {
      return NextResponse.json({ success: false, error: "Integration key invalida." }, { status: 400 });
    }

    return NextResponse.json({ success: false, error: "Falha inesperada ao criar credencial." }, { status: 500 });
  }
}
