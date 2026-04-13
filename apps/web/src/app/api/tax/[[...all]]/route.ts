import type { NextRequest } from "next/server";
import {
  proxyToBackend,
  resolveCatchAllBackendPath,
  type CatchAllRouteContext,
} from "@/app/api/_shared/backend-proxy";

async function proxyTax(request: NextRequest, context: CatchAllRouteContext): Promise<Response> {
  return proxyToBackend(request, {
    path: await resolveCatchAllBackendPath(context, "/tax"),
  });
}

export async function GET(request: NextRequest, context: CatchAllRouteContext) {
  return proxyTax(request, context);
}

export async function POST(request: NextRequest, context: CatchAllRouteContext) {
  return proxyTax(request, context);
}

export async function PUT(request: NextRequest, context: CatchAllRouteContext) {
  return proxyTax(request, context);
}

export async function PATCH(request: NextRequest, context: CatchAllRouteContext) {
  return proxyTax(request, context);
}

export async function DELETE(request: NextRequest, context: CatchAllRouteContext) {
  return proxyTax(request, context);
}

export async function OPTIONS(request: NextRequest, context: CatchAllRouteContext) {
  return proxyTax(request, context);
}
