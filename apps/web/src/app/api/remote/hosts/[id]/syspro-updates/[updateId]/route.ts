import { proxyToBackend } from "@/app/api/_shared/backend-proxy";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; updateId: string }> },
) {
  const { id, updateId } = await params;
  return proxyToBackend(request, {
    path: `/remote/hosts/${id}/syspro-updates/${updateId}`,
    internal: true,
  });
}
