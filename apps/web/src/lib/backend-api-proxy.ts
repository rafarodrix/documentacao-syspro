import { NextResponse } from "next/server";
import { getBackendApiBaseUrl, withInternalApiHeaders } from "@/lib/backend-api";

const HOP_BY_HOP_RESPONSE_HEADERS = new Set([
  "connection",
  "content-encoding",
  "content-length",
  "keep-alive",
  "transfer-encoding",
  "upgrade",
]);

export async function proxyBackendApiRequest(request: Request, path: string) {
  const url = `${getBackendApiBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
  const headers = withInternalApiHeaders({
    "content-type": request.headers.get("content-type") ?? "application/json",
  });

  const forwardedFor = request.headers.get("x-forwarded-for");
  const connectingIp = request.headers.get("cf-connecting-ip");
  const userAgent = request.headers.get("user-agent");
  const correlationId = request.headers.get("x-correlation-id");

  if (forwardedFor) headers.set("x-forwarded-for", forwardedFor);
  if (connectingIp) headers.set("cf-connecting-ip", connectingIp);
  if (userAgent) headers.set("user-agent", userAgent);
  if (correlationId) headers.set("x-correlation-id", correlationId);

  const response = await fetch(url, {
    method: request.method,
    headers,
    body: request.method === "GET" || request.method === "HEAD" ? undefined : await request.text(),
    cache: "no-store",
  });

  const responseHeaders = new Headers();
  response.headers.forEach((value, key) => {
    if (!HOP_BY_HOP_RESPONSE_HEADERS.has(key.toLowerCase())) {
      responseHeaders.set(key, value);
    }
  });

  return new NextResponse(await response.text(), {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });
}
