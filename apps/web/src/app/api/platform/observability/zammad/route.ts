import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { getProtectedSession } from "@/lib/auth-helpers";
import {
  getZammadMetricsSnapshot,
  getZammadRouteHealth,
} from "@/core/infrastructure/observability/zammad-observability";
import { prisma } from "@/lib/prisma";

const ROUTES = ["app-dashboard", "app-chamados", "notifications"] as const;

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getProtectedSession();
  if (!session || session.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  }

  const metrics = getZammadMetricsSnapshot([...ROUTES], 60);
  const health = ROUTES.map((routeKey) => getZammadRouteHealth(routeKey));
  const [breachedCount, noResponseCount] = await Promise.all([
    prisma.zammadTicketCache.count({ where: { breached: true } }),
    prisma.zammadTicketCache.count({ where: { firstResponseAt: null } }),
  ]);

  return NextResponse.json({
    metrics,
    health,
    sla: {
      breachedCount,
      noResponseCount,
    },
    generatedAt: new Date().toISOString(),
  });
}
