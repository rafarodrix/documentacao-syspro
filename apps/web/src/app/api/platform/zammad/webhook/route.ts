import { NextResponse } from "next/server";
import { zammadOperationalTicketSchema } from "@dosc-syspro/contracts";
import { upsertOperationalTicketsToCache } from "@/features/tickets/infrastructure/cache/zammad-ticket-cache";
import { handleZammadRemoteWebhook } from "@/features/remote/application/zammad-integration";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { isValidHmacSignature } from "@/lib/security/request-auth";

function isAuthorized(request: Request, rawBody: string): boolean {
  const hmacSecret = process.env.ZAMMAD_WEBHOOK_HMAC_SECRET ?? process.env.ZAMMAD_WEBHOOK_SECRET;
  if (!hmacSecret) return false;

  const signature =
    request.headers.get("x-zammad-signature") ??
    request.headers.get("x-zammad-webhook-signature") ??
    request.headers.get("x-hub-signature-256");

  return isValidHmacSignature(rawBody, signature, hmacSecret);
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
  const rawBody = await request.text();
  if (!isAuthorized(request, rawBody)) {
    return NextResponse.json({ success: false, error: "Nao autorizado." }, { status: 401 });
  }

  try {
    const payload = JSON.parse(rawBody) as Record<string, unknown>;
    const eventType = typeof payload?.event === "string" ? payload.event : "webhook";
    const rawTicket = extractTicketFromPayload(payload);
    const parsed = zammadOperationalTicketSchema.safeParse(rawTicket);

    if (parsed.success) {
      await upsertOperationalTicketsToCache([parsed.data], eventType);
    }

    const remoteResult = await handleZammadRemoteWebhook(payload);

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
    revalidateTag("remote-platform");
    return NextResponse.json({ success: true, remote: remoteResult });
  } catch (error) {
    console.error("zammad webhook error:", error);
    return NextResponse.json({ success: false, error: "Erro ao processar webhook." }, { status: 500 });
  }
}
