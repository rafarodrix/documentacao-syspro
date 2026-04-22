import { proxyToBackend } from "@/app/api/_shared/backend-proxy";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return proxyToBackend(request, { path: "/remote/rustdesk/address-book", internal: true });
}

