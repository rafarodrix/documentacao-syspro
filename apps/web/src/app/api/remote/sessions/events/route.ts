import { NextRequest } from "next/server";
import { getProtectedSession } from "@/lib/auth-helpers";
import { sessionEvents, SessionEventPayload } from "@/features/remote/infrastructure/events/session-events";
import { Role } from "@prisma/client";

/**
 * Endpoint de Server-Sent Events (SSE) para monitoramento global de sessoes.
 * Reservado para ADMIN, SUPORTE e DEVELOPER.
 */
export async function GET(req: NextRequest) {
  const session = await getProtectedSession();

  const allowedRoles: Role[] = [Role.ADMIN, Role.SUPORTE, Role.DEVELOPER];
  if (!session || !allowedRoles.includes(session.role)) {
    return new Response("Nao autorizado", { status: 401 });
  }

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      // Envia heartbeat inicial
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "heartbeat", timestamp: new Date().toISOString() })}\n\n`));

      // Subscreve a qualquer mudanca de sessao
      const unsubscribe = sessionEvents.onAnySessionChange((payload: SessionEventPayload) => {
        try {
          const data = JSON.stringify({
            type: "session_change",
            ...payload
          });
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        } catch (error) {
          console.error("Erro ao enviar evento SSE global de sessao:", error);
        }
      });

      // Cleanup
      req.signal.addEventListener("abort", () => {
        unsubscribe();
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
    },
  });
}
