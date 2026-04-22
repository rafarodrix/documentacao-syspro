import { proxyToBackend } from "@/app/api/_shared/backend-proxy";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return proxyToBackend(request, { path: "/remote/sessions/cleanup", internal: true });
}
