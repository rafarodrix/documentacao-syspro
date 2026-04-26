import type { NextRequest } from "next/server";
import { proxyToBackend } from "@/app/api/_shared/backend-proxy";

export async function PUT(request: NextRequest) {
  return proxyToBackend(request, {
    path: "/settings/permissions/matrix-visibility",
  });
}
