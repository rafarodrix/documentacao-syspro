import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stopRemoteSessionService } from "@/features/remote/application/session-actions";

/**
 * Endpoint de Webhook para integracao com Zammad.
 * Objetivo: Encerrar sessoes remotas automaticamente quando o ticket for fechado.
 */
export async function POST(req: NextRequest) {
  try {
    const secret = req.headers.get("X-Zammad-Webhook-Secret") || req.nextUrl.searchParams.get("secret");
    const expectedSecret = process.env.ZAMMAD_WEBHOOK_SECRET;

    if (expectedSecret && secret !== expectedSecret) {
      console.warn("[Zammad Webhook] Tentativa de acesso com secret invalido.");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await req.json();
    const ticket = payload?.ticket;
    const action = payload?.action;

    if (!ticket || !ticket.number) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const ticketNumber = String(ticket.number);
    const state = ticket.state?.toLowerCase();

    console.log(`[Zammad Webhook] Processando ticket #${ticketNumber}, estado: ${state}, acao: ${action}`);

    // Se o ticket foi fechado (closed) ou fundido (merged)
    if (state === "closed" || state === "merged" || state === "fechado") {
      const activeSessions = await prisma.remoteSession.findMany({
        where: {
          ticketNumber: ticketNumber,
          status: { not: "ENDED" },
        },
        select: { id: true },
      });

      if (activeSessions.length > 0) {
        console.log(`[Zammad Webhook] Encerrando ${activeSessions.length} sessao(oes) para o ticket #${ticketNumber}`);
        
        for (const session of activeSessions) {
          await stopRemoteSessionService(session.id, {
            userId: "system-zammad-webhook",
            userName: "Zammad Automation",
          });
        }
      }
    }

    return NextResponse.json({ success: true, processed: true });
  } catch (error) {
    console.error("[Zammad Webhook] Erro ao processar webhook:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
