import type { NextRequest } from "next/server";
import { getBackendApiBaseUrl } from "@/lib/backend-api";

type RouteContext = {
  params: Promise<{ all?: string[] }>;
};

async function proxyCompanies(request: NextRequest, context: RouteContext): Promise<Response> {
  const { all = [] } = await context.params;
  const suffix = all.length > 0 ? `/${all.join("/")}` : "";
  const upstreamUrl = `${getBackendApiBaseUrl()}/companies${suffix}${request.nextUrl.search}`;

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

export async function GET(request: NextRequest, context: RouteContext) {
  return proxyCompanies(request, context);
}

export async function POST(request: NextRequest, context: RouteContext) {
  return proxyCompanies(request, context);
}

export async function PUT(request: NextRequest, context: RouteContext) {
  return proxyCompanies(request, context);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  return proxyCompanies(request, context);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  return proxyCompanies(request, context);
}

export async function OPTIONS(request: NextRequest, context: RouteContext) {
  return proxyCompanies(request, context);
}
