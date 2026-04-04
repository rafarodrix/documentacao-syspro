import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createRequestLogger } from "@dosc-syspro/api/observability/logger";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { logger, responseHeaders } = createRequestLogger(request, {
    area: "api",
    feature: "remote-fleet-stats",
  });

  try {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const [
      totalHosts,
      activeHosts,
      offlineHostsCount,
      pendingDiscovered,
      allMetrics
    ] = await Promise.all([
      prisma.remoteHost.count(),
      prisma.remoteHost.count({ where: { status: "ACTIVE" } }),
      prisma.remoteHost.count({
        where: {
          status: "ACTIVE",
          OR: [
            { lastHeartbeatAt: { lt: oneHourAgo } },
            { lastHeartbeatAt: null }
          ]
        }
      }),
      prisma.remoteDiscoveredHost.count({ where: { status: "PENDING_LINK" } }),
      prisma.remoteHost.findMany({
        where: { lastAgentMetrics: { not: Prisma.DbNull } },
        select: { lastAgentMetrics: true }
      })
    ]);

    // Calcular hosts com disco baixo (< 10GB)
    let lowDiskCount = 0;
    const TEN_GB = 10 * 1024 * 1024 * 1024;

    for (const host of allMetrics) {
      const metrics = host.lastAgentMetrics as any;
      if (metrics?.diskFree && typeof metrics.diskFree === "number") {
        if (metrics.diskFree < TEN_GB) {
          lowDiskCount++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          total: totalHosts,
          active: activeHosts,
          offline: offlineHostsCount,
          pendingLink: pendingDiscovered,
          lowDisk: lowDiskCount
        },
        timestamp: now.toISOString()
      }
    }, { headers: responseHeaders });

  } catch (error) {
    logger.error("remote.fleet_stats.failed", error);

    return NextResponse.json({
      success: false,
      error: "Falha ao carregar estatísticas da frota."
    }, { status: 500, headers: responseHeaders });
  }
}
