import type { NextRequest } from "next/server";
import { proxyToBackend } from "@/app/api/_shared/backend-proxy";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  return proxyToBackend(request, {
    path: `/companies/${id}/status`,
  });
}
