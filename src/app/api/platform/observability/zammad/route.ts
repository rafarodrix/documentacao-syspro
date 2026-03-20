import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { getProtectedSession } from "@/lib/auth-helpers";
import {
  getZammadMetricsSnapshot,
  getZammadRouteHealth,
} from "@/core/infrastructure/observability/zammad-observability";

const ROUTES = ["app-dashboard", "app-chamados", "notifications"] as const;

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getProtectedSession();
  if (!session || session.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  }

  const metrics = getZammadMetricsSnapshot([...ROUTES], 60);
  const health = ROUTES.map((routeKey) => getZammadRouteHealth(routeKey));

  return NextResponse.json({
    metrics,
    health,
    generatedAt: new Date().toISOString(),
  });
}

