import { NextRequest } from "next/server";
import { ackEvents } from "@/features/remote/infrastructure/events/ack-events";
import { requireRemotePermission } from "@/features/remote/application/remote-access";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: hostId } = await params;
  const access = await requireRemotePermission("tools:all", "Nao autorizado");
  if (!access.ok) {
    return new Response("Nao autorizado", { status: 401 });
  }

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "heartbeat", hostId, timestamp: new Date().toISOString() })}\n\n`));

      const unsubscribe = ackEvents.onAck(hostId, (payload) => {
        try {
          const data = JSON.stringify({
            type: "ack_event",
            ...payload,
          });
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        } catch (error) {
          console.error(`Erro ao enviar evento SSE de ACK para host ${hostId}:`, error);
        }
      });

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
