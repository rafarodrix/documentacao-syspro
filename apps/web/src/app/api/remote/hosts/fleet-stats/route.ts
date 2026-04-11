import { getBackendApiBaseUrl } from "@/lib/backend-api";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const upstreamHeaders = new Headers(request.headers);
  upstreamHeaders.delete("host");
  upstreamHeaders.delete("content-length");

  const upstreamResponse = await fetch(`${getBackendApiBaseUrl()}/remote-admin/hosts/fleet-stats`, {
    method: "GET",
    headers: upstreamHeaders,
    redirect: "manual",
    cache: "no-store",
  });

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers: upstreamResponse.headers,
  });
}
