import { headers } from "next/headers";
import { resolveServerOrigin } from "@/lib/server-origin";

export async function getAppOriginAndCookie() {
  const requestHeaders = await headers();
  const cookie = requestHeaders.get("cookie") || "";
  const appOrigin = resolveServerOrigin(requestHeaders);
  return { appOrigin, cookie };
}

export async function callBackendApi<T>(feature: string, path: string, init?: RequestInit): Promise<T> {
  const { appOrigin, cookie } = await getAppOriginAndCookie();
  
  // Example: feature="users", path="/me" -> /api/users/me -> proxies to NestJS
  const url = `${appOrigin}/api/${feature}${path}`;
  const requestHeaders = new Headers(init?.headers);
  if (cookie && !requestHeaders.has("cookie")) {
    requestHeaders.set("cookie", cookie);
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
