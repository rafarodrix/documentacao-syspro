import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getProtectedSession } from "@/lib/auth-helpers";
import { getRemoteTenantScope } from "@/features/remote/application/scope";
import { resolveAddressBookCredentialFromRequest } from "@/features/remote/application/address-book-credentials";
import { createRemoteAddressBookPort } from "@/features/remote/infrastructure/gateways/remote-domain/address-book-port.gateway";
import { createTrilinkRemote } from "@dosc-syspro/remote-domain";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await getProtectedSession();
  const credential = await resolveAddressBookCredentialFromRequest(request);
  const hasCredentialAccess = !!credential;

  if (!session && !hasCredentialAccess) {
    return NextResponse.json({ success: false, error: "Nao autorizado." }, { status: 401 });
  }

  const tenantScope = hasCredentialAccess
    ? credential.scope === "GLOBAL"
      ? { isGlobalView: true, companyIds: [] }
      : { isGlobalView: false, companyIds: credential.companyId ? [credential.companyId] : [] }
    : await getRemoteTenantScope();

  const addressBookPort = createRemoteAddressBookPort();
  const trilinkRemote = createTrilinkRemote({ addressBookPort });

  try {
    const data = await trilinkRemote.listAddressBook({
      scope: {
        isGlobalView: tenantScope.isGlobalView,
        companyIds: tenantScope.companyIds,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        items: data.items,
        total: data.total,
      },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ success: false, error: "Escopo de consulta invalido." }, { status: 400 });
    }

    return NextResponse.json({ success: false, error: "Falha inesperada ao listar address book." }, { status: 500 });
  }
}
