/**
 * Proxy HTTP de apps/web para apps/api.
 *
 * Convencao:
 * - browser e SSR do portal falam sempre com `/app/api/...`
 * - as rotas em `app/api` delegam transporte para este helper
 * - `internal: true` so deve ser usado quando o endpoint do Nest exige
 *   `x-internal-api-key`
 * - nenhuma regra de negocio deve morar aqui
 */
import type { NextRequest } from "next/server";
import { getBackendApiBaseUrl, withInternalApiHeaders } from "@/lib/backend-api";

const BACKEND_PROXY_TIMEOUT_MS = 15_000;

export type CatchAllRouteContext = {
  params: Promise<{ all?: string[] }>;
};

export type ParamsRouteContext<TParams extends Record<string, string>> = {
  params: Promise<TParams>;
};

type ProxyRequest = Request | NextRequest;

type ProxyOptions = {
  // Caminho absoluto relativo ao backend Nest, por exemplo `/settings/general`.
  path: string;
  method?: string;
  body?: BodyInit | null | undefined;
  headers?: HeadersInit;
  // Injeta `x-internal-api-key` para endpoints internos do backend.
  internal?: boolean;
};

type ProxyHandlerOptions = Omit<ProxyOptions, "path" | "body">;
type Awaitable<T> = T | Promise<T>;

export async function resolveCatchAllBackendPath(
  context: CatchAllRouteContext,
  basePath: string,
): Promise<string> {
  const { all = [] } = await context.params;
  const suffix = all.length > 0 ? `/${all.join("/")}` : "";
  return `${basePath}${suffix}`;
}

export function createBackendProxyHeaders(
  request: ProxyRequest,
  headers?: HeadersInit,
  internal = false,
): Headers {
  const upstreamHeaders = new Headers(headers ?? request.headers);
  upstreamHeaders.delete("host");
  upstreamHeaders.delete("content-length");
  upstreamHeaders.delete("expect");
  upstreamHeaders.delete("connection");
  upstreamHeaders.delete("keep-alive");
  upstreamHeaders.delete("proxy-authenticate");
  upstreamHeaders.delete("proxy-authorization");
  upstreamHeaders.delete("te");
  upstreamHeaders.delete("trailer");
  upstreamHeaders.delete("transfer-encoding");
  upstreamHeaders.delete("upgrade");
  return internal ? withInternalApiHeaders(upstreamHeaders) : upstreamHeaders;
}

export function createStaticProxyHandler(
  path: string,
  options?: ProxyHandlerOptions,
) {
  return async function staticProxyHandler(request: ProxyRequest): Promise<Response> {
    return proxyToBackend(request, {
      ...options,
      path,
    });
  };
}

export function createParamsProxyHandler<TParams extends Record<string, string>>(
  buildPath: (params: TParams) => Awaitable<string>,
  options?: ProxyHandlerOptions,
) {
  return async function paramsProxyHandler(
    request: ProxyRequest,
    context: ParamsRouteContext<TParams>,
  ): Promise<Response> {
    const params = await context.params;
    const path = await buildPath(params);
    return proxyToBackend(request, {
      ...options,
      path,
    });
  };
}

export function createCatchAllProxyHandler(
  basePath: string,
  options?: ProxyHandlerOptions,
) {
  return async function catchAllProxyHandler(
    request: ProxyRequest,
    context: CatchAllRouteContext,
  ): Promise<Response> {
    const path = await resolveCatchAllBackendPath(context, basePath);
    return proxyToBackend(request, {
      ...options,
      path,
    });
  };
}

export async function proxyToBackend(
  request: ProxyRequest,
  { path, method, body, headers, internal = false }: ProxyOptions,
): Promise<Response> {
  const resolvedMethod = method ?? request.method;
  const search = new URL(request.url).search;
  const upstreamUrl = `${getBackendApiBaseUrl()}${path}${search}`;
  const correlationId =
    request.headers.get("x-correlation-id") ??
    request.headers.get("x-request-id") ??
    crypto.randomUUID();
  const upstreamHeaders = createBackendProxyHeaders(request, headers, internal);
  upstreamHeaders.set("x-correlation-id", correlationId);
  const shouldReadIncomingBody =
    body === undefined &&
    resolvedMethod !== "GET" &&
    resolvedMethod !== "HEAD" &&
    request.headers.get("content-length") !== "0";
  const upstreamBody =
    body !== undefined
      ? body
      : shouldReadIncomingBody
        ? await request.arrayBuffer()
        : undefined;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort("BACKEND_PROXY_TIMEOUT"), BACKEND_PROXY_TIMEOUT_MS);

  try {
    const upstreamResponse = await fetch(upstreamUrl, {
      method: resolvedMethod,
      headers: upstreamHeaders,
      body: upstreamBody,
      redirect: "manual",
      cache: "no-store",
      signal: controller.signal,
    });

    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: upstreamResponse.headers,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown proxy error";
    const isTimeout =
      (error instanceof Error && error.name === "AbortError") ||
      message.includes("BACKEND_PROXY_TIMEOUT");
    const status = message.includes("APP_BACKEND_API_URL nao configurada em producao")
      ? 503
      : isTimeout
        ? 504
        : 502;
    const code = status === 503
      ? "BACKEND_PROXY_CONFIG_ERROR"
      : status === 504
        ? "BACKEND_PROXY_TIMEOUT"
        : "BACKEND_PROXY_UPSTREAM_ERROR";

    console.error(
      JSON.stringify({
        level: "error",
        event: "backend.proxy.failed",
        ts: new Date().toISOString(),
        correlationId,
        method: resolvedMethod,
        path,
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
        correlationId,
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
