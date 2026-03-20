import { NextResponse } from "next/server";
import { zammadOperationalTicketSchema } from "@/core/application/schema/zammad-api.schema";
import { upsertOperationalTicketsToCache } from "@/core/infrastructure/cache/zammad-ticket-cache";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";

function isAuthorized(request: Request): boolean {
  const secret = process.env.ZAMMAD_WEBHOOK_SECRET;
  if (!secret) return false;

  const authHeader = request.headers.get("x-zammad-webhook-secret");
  if (authHeader && authHeader === secret) return true;

  const url = new URL(request.url);
  const token = url.searchParams.get("secret");
  return token === secret;
}

function extractTicketFromPayload(payload: unknown): unknown {
  if (!payload || typeof payload !== "object") return null;

  const obj = payload as Record<string, unknown>;
  if (obj.ticket && typeof obj.ticket === "object") return obj.ticket;
  if (obj.data && typeof obj.data === "object") {
    const data = obj.data as Record<string, unknown>;
    if (data.ticket && typeof data.ticket === "object") return data.ticket;
  }

  return obj;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Nao autorizado." }, { status: 401 });
  }

  try {
    const payload = await request.json();
    const eventType = typeof payload?.event === "string" ? payload.event : "webhook";
    const rawTicket = extractTicketFromPayload(payload);
    const parsed = zammadOperationalTicketSchema.safeParse(rawTicket);

    if (parsed.success) {
      await upsertOperationalTicketsToCache([parsed.data], eventType);
    }

    await prisma.zammadSyncState.upsert({
      where: { key: "default" },
      create: {
        key: "default",
        lastWebhookAt: new Date(),
        lastProcessedAt: new Date(),
      },
      update: {
        lastWebhookAt: new Date(),
        lastProcessedAt: new Date(),
      },
    });

    revalidateTag("tickets-list");
    revalidateTag("tickets-dashboard");
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("zammad webhook error:", error);
    return NextResponse.json({ success: false, error: "Erro ao processar webhook." }, { status: 500 });
  }
}

