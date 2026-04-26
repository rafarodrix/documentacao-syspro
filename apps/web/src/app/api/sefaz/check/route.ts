import { NextResponse } from "next/server";
import { createRequestLogger } from "@dosc-syspro/shared/logger";
import { executeSefazCheck, isSefazCheckAuthorized } from "@/features/settings/application/sefaz-check";

/**
 * Entrada publica/externa do check SEFAZ.
 *
 * Continua separada de `/api/platform/settings/sefaz/check/internal` porque
 * aqui existe validacao por segredo para chamadas vindas de cron/webhook.
 * Depois da autorizacao, a execucao real segue pelo fluxo interno padronizado.
 */
async function handleSefazCheck(request: Request) {
  const { logger, responseHeaders, correlationId } = createRequestLogger(request, {
    area: "api",
    feature: "sefaz-check",
  });
  if (!isSefazCheckAuthorized(request)) {
    logger.warn("sefaz.check.unauthorized");
    return NextResponse.json({ ok: false, error: "Nao autorizado." }, { status: 401, headers: responseHeaders });
  }

  const result = await executeSefazCheck(correlationId);
  if (!result.ok) {
    logger.warn("sefaz.check.backend_failed", { status: result.status });
    return NextResponse.json(result.body, { status: result.status, headers: responseHeaders });
  }

  logger.info("sefaz.check.completed", result.body);
  return NextResponse.json(result.body, { headers: responseHeaders });
}

export async function GET(request: Request) {
  return handleSefazCheck(request);
}

export async function POST(request: Request) {
  return handleSefazCheck(request);
}
