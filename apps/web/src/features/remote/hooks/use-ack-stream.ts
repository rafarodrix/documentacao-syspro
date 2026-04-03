import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface AckPayload {
  hostId: string;
  commandId: string;
  status: string;
  message?: string;
  timestamp: string;
}

interface TelemetryPayload {
  hostId: string;
  metrics: {
    cpuLoad?: number;
    ramUsedPc?: number;
    ramTotal?: number;
    diskFree?: number;
    diskTotal?: number;
    [key: string]: any;
  };
  timestamp: string;
}

export function useAckStream(hostId: string | null) {
  const router = useRouter();
  const eventSourceRef = useRef<EventSource | null>(null);
  const [lastTelemetry, setLastTelemetry] = useState<TelemetryPayload["metrics"] | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!hostId) {
      setIsConnected(false);
      return;
    }

    const url = `/api/remote/hosts/${hostId}/events`;
    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => setIsConnected(true);

    eventSource.addEventListener("ack", (event) => {
      try {
        const payload = JSON.parse(event.data) as AckPayload;
        
        if (payload.status === "ACKNOWLEDGED") {
          toast.success(`Acao concluida: ${payload.message || "Sucesso"}`);
        } else if (payload.status === "FAILED") {
          toast.error(`Acao falhou: ${payload.message || "Erro desconhecido"}`);
        }

        router.refresh();
      } catch (e) {
        console.error("Erro ao processar dados SSE ACK:", e);
      }
    });

    eventSource.addEventListener("telemetry", (event) => {
      try {
        const payload = JSON.parse(event.data) as TelemetryPayload;
        setLastTelemetry(payload.metrics);
        // Opcional: router.refresh() para atualizar dados persistidos em Server Components
        // mas o estado lastTelemetry ja serve para os cards dinamicos.
      } catch (e) {
        console.error("Erro ao processar dados SSE Telemetry:", e);
      }
    });

    eventSource.onerror = (e) => {
      console.error("Erro na conexao SSE:", e);
      setIsConnected(false);
    };

    return () => {
      eventSource.close();
      eventSourceRef.current = null;
      setIsConnected(false);
    };
  }, [hostId, router]);

  return {
    isConnected,
    lastTelemetry
  };
}
