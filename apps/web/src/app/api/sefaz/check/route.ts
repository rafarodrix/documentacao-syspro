import { NextResponse } from "next/server";
import { isValidSecretToken } from "@dosc-syspro/shared/request-auth";
import { createRequestLogger } from "@dosc-syspro/shared/logger";
import { getBackendApiBaseUrl, withInternalApiHeaders } from "@/lib/backend-api";

function isAuthorized(request: Request): boolean {
  const expected = process.env.SEFAZ_CHECK_SECRET ?? process.env.REVALIDATE_SECRET;
  if (!expected) return false;
  return isValidSecretToken(request, expected, {
    headerName: "x-sefaz-check-secret",
    queryName: "secret",
    allowBearer: true,
  });
}

export async function GET(request: Request) {
  const { logger, responseHeaders, correlationId } = createRequestLogger(request, {
    area: "api",
    feature: "sefaz-check",
  });
  if (!isAuthorized(request)) {
    logger.warn("sefaz.check.unauthorized");
    return NextResponse.json({ ok: false, error: "Nao autorizado." }, { status: 401, headers: responseHeaders });
  }

  const response = await fetch(`${getBackendApiBaseUrl()}/settings/sefaz/check/internal`, {
    method: "POST",
    headers: withInternalApiHeaders({
      "x-correlation-id": correlationId,
    }),
    cache: "no-store",
  });
  const result = await response.json();
  if (!response.ok) {
    logger.warn("sefaz.check.backend_failed", { status: response.status });
    return NextResponse.json(result, { status: response.status, headers: responseHeaders });
  }
  logger.info("sefaz.check.completed", result);
  return NextResponse.json(result, { headers: responseHeaders });
}

export async function POST(request: Request) {
  const { logger, responseHeaders, correlationId } = createRequestLogger(request, {
    area: "api",
    feature: "sefaz-check",
  });
  if (!isAuthorized(request)) {
    logger.warn("sefaz.check.unauthorized");
    return NextResponse.json({ ok: false, error: "Nao autorizado." }, { status: 401, headers: responseHeaders });
  }

  const response = await fetch(`${getBackendApiBaseUrl()}/settings/sefaz/check/internal`, {
    method: "POST",
    headers: withInternalApiHeaders({
      "x-correlation-id": correlationId,
    }),
    cache: "no-store",
  });
  const result = await response.json();
  if (!response.ok) {
    logger.warn("sefaz.check.backend_failed", { status: response.status });
    return NextResponse.json(result, { status: response.status, headers: responseHeaders });
  }
  logger.info("sefaz.check.completed", result);
  return NextResponse.json(result, { headers: responseHeaders });
}
