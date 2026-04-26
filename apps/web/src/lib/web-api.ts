import { headers } from "next/headers";
import { resolveServerOrigin } from "@/lib/server-origin";

export async function callWebApi(path: string, init?: RequestInit): Promise<Response> {
  const requestHeaders = await headers();
  const cookie = requestHeaders.get("cookie");
  const origin = resolveServerOrigin(requestHeaders);

  return fetch(`${origin}${path}`, {
    ...init,
    headers: {
      ...(cookie ? { cookie } : {}),
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
}
