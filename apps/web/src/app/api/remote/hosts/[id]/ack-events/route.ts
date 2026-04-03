import { NextRequest } from "next/server";
import { getProtectedSession } from "@/lib/auth-helpers";
import { ackEvents } from "@/features/remote/infrastructure/events/ack-events";
import { Role } from "@prisma/client";

/**
 * Endpoint de Server-Sent Events (SSE) para monitoramento de comandos em um host especifico.
 * Reservado para ADMIN, SUPORTE e DEVELOPER.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: hostId } = await params;
  const session = await getProtectedSession();

  const allowedRoles: Role[] = [Role.ADMIN, Role.SUPORTE, Role.DEVELOPER];
  if (!session || !allowedRoles.includes(session.role)) {
    return new Response("Nao autorizado", { status: 401 });
  }

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      // Envia heartbeat inicial
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "heartbeat", hostId, timestamp: new Date().toISOString() })}\n\n`));

      // Subscreve a mudancas de comando NO HOST especifico
      const unsubscribe = ackEvents.onAck(hostId, (payload) => {
        try {
          const data = JSON.stringify({
            type: "ack_event",
            ...payload
          });
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        } catch (error) {
          console.error(`Erro ao enviar evento SSE de ACK para host ${hostId}:`, error);
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
