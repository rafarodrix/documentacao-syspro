import { proxyBackendApiRequest } from "@/lib/backend-api-proxy";

export const dynamic = "force-dynamic";

export function POST(request: Request) {
  return proxyBackendApiRequest(request, "/remote/rustdesk/sync");
}
