import { NextRequest } from "next/server";
import { getProtectedSession } from "@/lib/auth-helpers";
import { ackEvents } from "@/features/remote/infrastructure/events/ack-events";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getProtectedSession();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id: hostId } = await params;

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      // Funcao para enviar eventos formatados SSE
      const sendEvent = (data: any, eventName = "message") => {
        try {
          const payload = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(payload));
        } catch (e) {
          console.error("Erro ao enviar evento SSE:", e);
        }
      };

      // Heartbeat a cada 20s para manter a conexao viva
      const heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": heartbeat\n\n"));
        } catch (e) {
          // O controller pode já estar fechado
          clearInterval(heartbeatInterval);
        }
      }, 20000);

      // Subscreve aos eventos do Event Hub
      const unsubscribe = ackEvents.onAck(hostId, (payload) => {
        sendEvent(payload, "ack");
      });

      // Limpeza ao fechar a conexao
      request.signal.addEventListener("abort", () => {
        clearInterval(heartbeatInterval);
        unsubscribe();
        try {
          controller.close();
        } catch (e) {
          // Ignorar se já fechado
        }
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
