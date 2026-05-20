import "server-only";

import type { NextRequest } from "next/server";
import { getBackendApiBaseUrl } from "@/lib/backend-api";

/**
 * Proxy dedicado de auth.
 *
 * Auth precisa preservar melhor o comportamento bruto do upstream e responder
 * OPTIONS/CORS manualmente. Por isso esse fluxo nao usa `proxyToBackend`.
 */
type AuthProxyContext = {
  params: Promise<{ all?: string[] }>;
};

const AUTH_PROXY_TIMEOUT_MS = 10_000;

export async function proxyAuthRequest(request: NextRequest, context: AuthProxyContext): Promise<Response> {
  const { all = [] } = await context.params;
  const suffix = all.length > 0 ? `/${all.join("/")}` : "";
  const upstreamUrl = `${getBackendApiBaseUrl()}/auth${suffix}${request.nextUrl.search}`;
  const correlationId =
    request.headers.get("x-correlation-id") ??
    request.headers.get("x-request-id") ??
    crypto.randomUUID();

  const upstreamHeaders = new Headers(request.headers);
  upstreamHeaders.delete("host");
  upstreamHeaders.delete("content-length");
  // Remove browser origin/referer: este é um proxy server-to-server, não uma
  // requisição de browser direto. Sem o cabeçalho origin o Better Auth trata como
  // chamada server-side e ignora a verificação CSRF de origem, evitando falha
  // quando EXTRA_TRUSTED_ORIGINS não inclui o domínio do frontend.
  upstreamHeaders.delete("origin");
  upstreamHeaders.delete("referer");
  upstreamHeaders.set("x-correlation-id", correlationId);

  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  const bodyText = hasBody ? await request.text() : undefined;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort("AUTH_PROXY_TIMEOUT"), AUTH_PROXY_TIMEOUT_MS);

  try {
    const upstream = await fetch(upstreamUrl, {
      method: request.method,
      headers: upstreamHeaders,
      ...(hasBody ? { body: bodyText } : {}),
      redirect: "manual",
      cache: "no-store",
      signal: controller.signal,
    });

    // Log sempre — essencial para diagnosticar 404/502 vindos do backend
    console.log(
      JSON.stringify({
        event: "auth.proxy.upstream.response",
        correlationId,
        method: request.method,
        path: request.nextUrl.pathname,
        upstreamUrl,
        upstreamStatus: upstream.status,
      }),
    );

    return upstream;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown proxy error";
    const isTimeout =
      (error instanceof Error && error.name === "AbortError") ||
      message.includes("AUTH_PROXY_TIMEOUT");
    const status = message.includes("APP_BACKEND_API_URL nao configurada em producao")
      ? 503
      : isTimeout
        ? 504
        : 502;
    const code = status === 503
      ? "AUTH_PROXY_CONFIG_ERROR"
      : status === 504
        ? "AUTH_PROXY_TIMEOUT"
        : "AUTH_PROXY_UPSTREAM_ERROR";

    console.error(
      JSON.stringify({
        level: "error",
        event: "auth.proxy.failed",
        ts: new Date().toISOString(),
        correlationId,
        method: request.method,
        path: request.nextUrl.pathname,
        upstreamUrl,
        status,
        code,
        error: message,
      }),
    );

    return Response.json(
      {
        error: message,
        code,
        upstreamUrl,
      },
      {
        status,
        headers: {
          "x-correlation-id": correlationId,
        },
      },
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

export function createAuthProxyOptionsResponse(request: NextRequest): Response {
  const origin = request.headers.get("origin") ?? "*";
  const requestHeaders =
    request.headers.get("access-control-request-headers") ??
    "content-type,authorization";

  return new Response(null, {
    status: 204,
    headers: {
      "access-control-allow-origin": origin,
      "access-control-allow-methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
      "access-control-allow-headers": requestHeaders,
      "access-control-allow-credentials": "true",
      vary: "origin, access-control-request-headers",
    },
  });
}
