import "server-only";

import { isValidSecretToken } from "@dosc-syspro/shared/request-auth";
import { callWebApi } from "@/lib/web-api";

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
  const response = await callWebApi("/api/platform/settings/sefaz/check/internal", {
    method: "POST",
    headers: {
      "x-correlation-id": correlationId,
    },
  });

  const body = await response.json();

  return {
    ok: response.ok,
    status: response.status,
    body,
  };
}
