import { proxyToBackend } from "@/app/api/_shared/backend-proxy";

export const dynamic = "force-dynamic";

export function POST(request: Request) {
  return proxyToBackend(request, { path: "/remote/rustdesk/sync", internal: true });
}
