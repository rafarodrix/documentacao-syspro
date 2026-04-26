import type { NextRequest } from "next/server";
import {
  proxyToBackend,
  resolveCatchAllBackendPath,
  type CatchAllRouteContext,
} from "@/app/api/_shared/backend-proxy";

export async function GET(request: NextRequest, context: CatchAllRouteContext) {
  const path = await resolveCatchAllBackendPath(context, "/tickets");
  return proxyToBackend(request, { path });
}

export async function POST(request: NextRequest, context: CatchAllRouteContext) {
  const path = await resolveCatchAllBackendPath(context, "/tickets");
  return proxyToBackend(request, { path });
}

export async function PATCH(request: NextRequest, context: CatchAllRouteContext) {
  const path = await resolveCatchAllBackendPath(context, "/tickets");
  return proxyToBackend(request, { path });
}

export async function DELETE(request: NextRequest, context: CatchAllRouteContext) {
  const path = await resolveCatchAllBackendPath(context, "/tickets");
  return proxyToBackend(request, { path });
}
