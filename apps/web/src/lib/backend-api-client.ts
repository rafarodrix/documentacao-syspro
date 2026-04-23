import { headers } from "next/headers";
import { getBackendApiBaseUrl, withInternalApiHeaders } from "@/lib/backend-api";

export async function getRequestCookie() {
  const requestHeaders = await headers();
  return requestHeaders.get("cookie") || "";
}

async function getPortalOrigin() {
  const requestHeaders = await headers();
  const explicitOrigin = requestHeaders.get("origin");
  if (explicitOrigin?.trim()) {
    return explicitOrigin.trim();
  }

  const host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host");
  if (!host?.trim()) {
    return "";
  }

  const protocol = requestHeaders.get("x-forwarded-proto") || "https";
  return `${protocol}://${host.trim()}`;
}

export async function callBackendApi<T>(feature: string, path: string, init?: RequestInit): Promise<T> {
  const cookie = await getRequestCookie();
  const portalOrigin = await getPortalOrigin();
  const url = `${getBackendApiBaseUrl()}/${feature}${path}`;
  const requestHeaders = withInternalApiHeaders(init?.headers);

  if (cookie && !requestHeaders.has("cookie")) {
    requestHeaders.set("cookie", cookie);
  }
  if (portalOrigin && !requestHeaders.has("x-portal-origin")) {
    requestHeaders.set("x-portal-origin", portalOrigin);
  }

  const response = await fetch(url, {
    ...init,
    headers: requestHeaders,
    cache: "no-store",
  });

  let json: any = null;
  try {
    json = await response.json();
  } catch {
    json = null;
  }

  if (!response.ok) {
    const message = json?.error || json?.message || `Falha na integracao (${response.status}).`;
    throw new Error(message);
  }

  return json as T;
}
