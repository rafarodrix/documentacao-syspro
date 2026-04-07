import type { NextRequest } from "next/server";
import { getBackendApiBaseUrl } from "@/lib/backend-api";

type RouteContext = {
  params: Promise<{ all?: string[] }>;
};

async function proxyAuth(request: NextRequest, context: RouteContext): Promise<Response> {
  try {
    const { all = [] } = await context.params;
    const suffix = all.length > 0 ? `/${all.join("/")}` : "";
    const upstreamUrl = `${getBackendApiBaseUrl()}/auth${suffix}${request.nextUrl.search}`;

    const upstreamHeaders = new Headers(request.headers);
    upstreamHeaders.delete("host");
    upstreamHeaders.delete("content-length");

    const hasBody = request.method !== "GET" && request.method !== "HEAD";
    const bodyText = hasBody ? await request.text() : undefined;

    return fetch(upstreamUrl, {
      method: request.method,
      headers: upstreamHeaders,
      ...(hasBody ? { body: bodyText } : {}),
      redirect: "manual",
      cache: "no-store",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown proxy error";
    console.error("[auth-proxy] failed", error);
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest, context: RouteContext) {
  return proxyAuth(request, context);
}

export async function POST(request: NextRequest, context: RouteContext) {
  return proxyAuth(request, context);
}

export async function PUT(request: NextRequest, context: RouteContext) {
  return proxyAuth(request, context);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  return proxyAuth(request, context);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  return proxyAuth(request, context);
}

export async function OPTIONS(request: NextRequest, context: RouteContext) {
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
