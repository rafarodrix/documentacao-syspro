import type { NextRequest } from "next/server";
import { getBackendApiBaseUrl } from "@/lib/backend-api";

export type CatchAllRouteContext = {
  params: Promise<{ all?: string[] }>;
};

type ProxyRequest = Request | NextRequest;

type ProxyOptions = {
  path: string;
  method?: string;
  body?: BodyInit | null | undefined;
  headers?: HeadersInit;
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
): Headers {
  const upstreamHeaders = new Headers(headers ?? request.headers);
  upstreamHeaders.delete("host");
  upstreamHeaders.delete("content-length");
  return upstreamHeaders;
}

export async function proxyToBackend(
  request: ProxyRequest,
  { path, method, body, headers }: ProxyOptions,
): Promise<Response> {
  const search = new URL(request.url).search;
  const upstreamResponse = await fetch(`${getBackendApiBaseUrl()}${path}${search}`, {
    method: method ?? request.method,
    headers: createBackendProxyHeaders(request, headers),
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
