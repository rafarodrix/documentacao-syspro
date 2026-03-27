import { NextResponse } from "next/server";
import { getProtectedSession } from "@/lib/auth-helpers";
import { getRemoteTenantScope } from "@/features/remote/application/scope";
import { resolveAddressBookCredentialFromRequest } from "@/features/remote/application/address-book-credentials";
import { createRemoteAddressBookPort } from "@/features/remote/infrastructure/gateways/remote-domain/address-book-port.gateway";
import { createTrilinkRemote } from "@dosc-syspro/remote-domain";
import { remoteErrorResponse, toRemoteDomainErrorResponse } from "@/app/api/remote/_shared/remote-domain-error";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await getProtectedSession();
  const credential = await resolveAddressBookCredentialFromRequest(request);
  const hasCredentialAccess = !!credential;

  if (!session && !hasCredentialAccess) {
    return remoteErrorResponse({ code: "UNAUTHORIZED", message: "Nao autorizado.", httpStatus: 401 });
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
    return toRemoteDomainErrorResponse(error, {
      validationMessage: "Escopo de consulta invalido.",
      defaultMessage: "Falha inesperada ao listar address book.",
    });
  }
}

