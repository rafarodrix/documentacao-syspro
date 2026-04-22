import { proxyToBackend } from "@/app/api/_shared/backend-proxy";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  return proxyToBackend(request, { path: "/remote/sessions", internal: true });
}

export function POST(request: Request) {
  return proxyToBackend(request, { path: "/remote/sessions", internal: true });
}
