import { proxyToBackend } from "@/app/api/_shared/backend-proxy";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyToBackend(request, { path: `/remote/discovered-hosts/${id}/ignore`, internal: true });
}
