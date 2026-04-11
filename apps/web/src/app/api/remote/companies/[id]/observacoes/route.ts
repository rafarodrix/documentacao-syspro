import { getBackendApiBaseUrl } from "@/lib/backend-api";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const upstreamHeaders = new Headers(request.headers);
  upstreamHeaders.delete("host");
  upstreamHeaders.delete("content-length");
  const body = await request.arrayBuffer();

  const upstreamResponse = await fetch(`${getBackendApiBaseUrl()}/remote-admin/companies/${id}/observacoes`, {
    method: "PATCH",
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
