import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { ZammadGateway } from "@/features/tickets/infrastructure/gateways/zammad-gateway";
import { upsertOperationalTicketsToCache } from "@/features/tickets/infrastructure/cache/zammad-ticket-cache";
import { prisma } from "@/lib/prisma";
import { isValidSecretToken } from "@dosc-syspro/api/request-auth";
import { createRequestLogger } from "@/lib/observability/logger";

function isAuthorized(request: Request): boolean {
  const secret = process.env.ZAMMAD_SYNC_SECRET;
  if (!secret) return false;
  return isValidSecretToken(request, secret, {
    headerName: "x-zammad-sync-secret",
    queryName: "secret",
    allowBearer: true,
  });
}

export async function POST(request: Request) {
  const { logger, responseHeaders } = createRequestLogger(request, {
    area: "api",
    feature: "zammad-sync",
  });
  if (!isAuthorized(request)) {
    logger.warn("zammad.sync.unauthorized");
    return NextResponse.json({ success: false, error: "Nao autorizado." }, { status: 401, headers: responseHeaders });
  }

  try {
    const pages = Number(process.env.ZAMMAD_SYNC_PAGES ?? 3);
    const perPage = Number(process.env.ZAMMAD_SYNC_PER_PAGE ?? 50);
    const collected = [];

    for (let page = 1; page <= pages; page += 1) {
      const items = await ZammadGateway.getAllTickets(perPage, {
        page,
        routeKey: "sync-worker",
        cacheTtlSeconds: 0,
      });
      if (!items.length) break;
      collected.push(...items);
    }

    await upsertOperationalTicketsToCache(collected, "worker-sync");

    await prisma.zammadSyncState.upsert({
      where: { key: "default" },
      create: {
        key: "default",
        lastWorkerSyncAt: new Date(),
        lastProcessedAt: new Date(),
      },
      update: {
        lastWorkerSyncAt: new Date(),
        lastProcessedAt: new Date(),
      },
    });

    revalidateTag("tickets-list");
    revalidateTag("tickets-dashboard");

    logger.info("zammad.sync.succeeded", {
      synced: collected.length,
      pages,
      perPage,
    });

    return NextResponse.json({ success: true, synced: collected.length }, { headers: responseHeaders });
  } catch (error) {
    logger.error("zammad.sync.failed", error);
    return NextResponse.json({ success: false, error: "Erro no sync incremental." }, { status: 500, headers: responseHeaders });
  }
}

export async function GET(request: Request) {
  return POST(request);
}
