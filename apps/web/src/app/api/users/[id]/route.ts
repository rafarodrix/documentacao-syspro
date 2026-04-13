import type { NextRequest } from "next/server";
import { proxyToBackend } from "@/app/api/_shared/backend-proxy";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  return proxyToBackend(request, {
    path: `/users/${id}`,
  });
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  return proxyToBackend(request, {
    path: `/users/${id}`,
  });
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  return proxyToBackend(request, {
    path: `/users/${id}`,
  });
}
