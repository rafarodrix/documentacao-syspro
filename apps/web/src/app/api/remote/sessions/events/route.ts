import { NextRequest } from "next/server";
import { sessionEvents, SessionEventPayload } from "@/features/remote/infrastructure/events/session-events";
import { requireRemotePermission } from "@/features/remote/application/remote-access";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const access = await requireRemotePermission("tools:all", "Nao autorizado");
  if (!access.ok) {
    return new Response("Nao autorizado", { status: 401 });
  }

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      const send = (data: string) => {
        try {
          controller.enqueue(encoder.encode(data));
        } catch {
          // controller already closed
        }
      };

      send(`data: ${JSON.stringify({ type: "heartbeat", timestamp: new Date().toISOString() })}\n\n`);

      // Heartbeat a cada 25s para manter a conexao ativa e detectar clientes desconectados
      const heartbeatInterval = setInterval(() => {
        send(": heartbeat\n\n");
      }, 25000);

      const unsubscribe = sessionEvents.onAnySessionChange((payload: SessionEventPayload) => {
        send(`data: ${JSON.stringify({ type: "session_change", ...payload })}\n\n`);
      });

      req.signal.addEventListener("abort", () => {
        clearInterval(heartbeatInterval);
        unsubscribe();
        try {
          controller.close();
        } catch {
          // already closed
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
