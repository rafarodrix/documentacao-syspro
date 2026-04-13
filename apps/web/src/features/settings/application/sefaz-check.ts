import "server-only";

import { isValidSecretToken } from "@dosc-syspro/shared/request-auth";
import { getBackendApiBaseUrl, withInternalApiHeaders } from "@/lib/backend-api";

export function isSefazCheckAuthorized(request: Request): boolean {
  const expected = process.env.SEFAZ_CHECK_SECRET ?? process.env.REVALIDATE_SECRET;
  if (!expected) return false;
  return isValidSecretToken(request, expected, {
    headerName: "x-sefaz-check-secret",
    queryName: "secret",
    allowBearer: true,
  });
}

export async function executeSefazCheck(correlationId: string) {
  const response = await fetch(`${getBackendApiBaseUrl()}/settings/sefaz/check/internal`, {
    method: "POST",
    headers: withInternalApiHeaders({
      "x-correlation-id": correlationId,
    }),
    cache: "no-store",
  });

  const body = await response.json();

  return {
    ok: response.ok,
    status: response.status,
    body,
  };
}
