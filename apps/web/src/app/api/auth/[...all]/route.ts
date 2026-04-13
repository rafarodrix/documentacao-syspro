import type { NextRequest } from "next/server";
import {
  createAuthProxyOptionsResponse,
  proxyAuthRequest,
} from "@/features/auth/infrastructure/auth-proxy";

type RouteContext = {
  params: Promise<{ all?: string[] }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  return proxyAuthRequest(request, context);
}

export async function POST(request: NextRequest, context: RouteContext) {
  return proxyAuthRequest(request, context);
}

export async function PUT(request: NextRequest, context: RouteContext) {
  return proxyAuthRequest(request, context);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  return proxyAuthRequest(request, context);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  return proxyAuthRequest(request, context);
}

export async function OPTIONS(request: NextRequest, context: RouteContext) {
  void context;
  return createAuthProxyOptionsResponse(request);
}
