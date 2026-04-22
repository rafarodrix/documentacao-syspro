import { proxyToBackend } from "@/app/api/_shared/backend-proxy";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return proxyToBackend(request, {
    path: "/remote/rustdesk/client-profile",
    headers: {
      ...Object.fromEntries(request.headers.entries()),
      "x-portal-origin": new URL(request.url).origin,
    },
    internal: true,
  });
}
