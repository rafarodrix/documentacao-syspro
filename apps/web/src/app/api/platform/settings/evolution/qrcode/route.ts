import type { NextRequest } from "next/server";
import { proxyToBackend } from "@/app/api/_shared/backend-proxy";

export async function POST(request: NextRequest) {
  return proxyToBackend(request, {
    path: "/settings/evolution/qrcode",
  });
}
