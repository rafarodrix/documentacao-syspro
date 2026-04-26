import type { NextRequest } from "next/server";
import { proxyToBackend } from "@/app/api/_shared/backend-proxy";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return proxyToBackend(request, {
    path: "/settings/platform-notifications",
  });
}
