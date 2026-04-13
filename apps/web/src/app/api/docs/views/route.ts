import type { NextRequest } from "next/server";
import { proxyToBackend } from "@/app/api/_shared/backend-proxy";

async function proxyDocsViews(request: NextRequest): Promise<Response> {
  return proxyToBackend(request, { path: "/docs/views" });
}

export async function GET(request: NextRequest) {
  return proxyDocsViews(request);
}

export async function POST(request: NextRequest) {
  return proxyDocsViews(request);
}

export async function OPTIONS(request: NextRequest) {
  return proxyDocsViews(request);
}
