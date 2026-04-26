import type { NextRequest } from "next/server";
import {
  proxyToBackend,
  resolveCatchAllBackendPath,
  type CatchAllRouteContext,
} from "@/app/api/_shared/backend-proxy";

export async function GET(request: NextRequest, context: CatchAllRouteContext) {
  const path = await resolveCatchAllBackendPath(context, "/tax");
  return proxyToBackend(request, { path });
}
