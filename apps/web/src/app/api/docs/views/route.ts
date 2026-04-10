import type { NextRequest } from "next/server";
import { getBackendApiBaseUrl } from "@/lib/backend-api";

async function proxyDocsViews(request: NextRequest): Promise<Response> {
  const upstreamUrl = `${getBackendApiBaseUrl()}/docs/views${request.nextUrl.search}`;

  const upstreamHeaders = new Headers(request.headers);
  upstreamHeaders.delete("host");
  upstreamHeaders.delete("content-length");

  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  const body = hasBody ? await request.arrayBuffer() : undefined;

  const upstreamResponse = await fetch(upstreamUrl, {
    method: request.method,
    headers: upstreamHeaders,
    body,
    redirect: "manual",
    cache: "no-store",
  });

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers: upstreamResponse.headers,
  });
}

export async function GET(request: NextRequest) {
  return proxyDocsViews(request);
}

export async function POST(request: NextRequest) {
  return proxyDocsViews(request);
}

export async function OPTIONS(request: NextRequest) {
  return proxyDocsViews(request);
}
