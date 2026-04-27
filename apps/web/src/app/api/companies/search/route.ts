import type { NextRequest } from "next/server";
import { proxyToBackend } from "@/app/api/_shared/backend-proxy";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q") || "";
  const path = query ? `/companies/search?q=${encodeURIComponent(query)}` : "/companies/search";
  return proxyToBackend(request, { path });
}
