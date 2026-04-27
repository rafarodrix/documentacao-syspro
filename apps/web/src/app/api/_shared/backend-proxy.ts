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

export type CatchAllRouteContext = {
  params: Promise<{ all?: string[] }>;
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

export async function proxyToBackend(
  request: ProxyRequest,
  { path, method, body, headers, internal = false }: ProxyOptions,
): Promise<Response> {
  const search = new URL(request.url).search;
  const upstreamResponse = await fetch(`${getBackendApiBaseUrl()}${path}${search}`, {
    method: method ?? request.method,
    headers: createBackendProxyHeaders(request, headers, internal),
    body: body === undefined
      ? request.method !== "GET" && request.method !== "HEAD"
        ? await request.arrayBuffer()
        : undefined
      : body,
    redirect: "manual",
    cache: "no-store",
  });

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers: upstreamResponse.headers,
  });
}
