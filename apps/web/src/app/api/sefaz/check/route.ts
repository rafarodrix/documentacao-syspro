import { NextResponse } from "next/server";
import { SefazService } from "@/app/api/sefaz/sefaz.service";
import { isValidSecretToken } from "@/lib/security/request-auth";
import { createRequestLogger } from "@/lib/observability/logger";

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

  const service = new SefazService(correlationId);
  const result = await service.runFullCheck();
  logger.info("sefaz.check.completed", result);
  return NextResponse.json({ ok: true, ...result }, { headers: responseHeaders });
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

  const service = new SefazService(correlationId);
  const result = await service.runFullCheck();
  logger.info("sefaz.check.completed", result);
  return NextResponse.json({ ok: true, ...result }, { headers: responseHeaders });
}
