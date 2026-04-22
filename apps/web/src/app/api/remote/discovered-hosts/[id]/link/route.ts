import { proxyToBackend } from "@/app/api/_shared/backend-proxy";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyToBackend(request, { path: `/remote/discovered-hosts/${id}/link`, internal: true });
}
