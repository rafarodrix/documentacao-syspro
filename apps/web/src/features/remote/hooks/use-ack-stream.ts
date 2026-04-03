"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface AckPayload {
  hostId: string;
  commandId: string;
  status: string;
  message?: string;
  timestamp: string;
}

export function useAckStream(hostId: string | null) {
  const router = useRouter();
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!hostId) return;

    const url = `/api/remote/hosts/${hostId}/events`;
    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.addEventListener("ack", (event) => {
      try {
        const payload = JSON.parse(event.data) as AckPayload;
        
        // Notificacao visual baseada no status
        if (payload.status === "ACKNOWLEDGED") {
          toast.success(`Acao concluida: ${payload.message || "Sucesso"}`);
        } else if (payload.status === "FAILED") {
          toast.error(`Acao falhou: ${payload.message || "Erro desconhecido"}`);
        } else {
          toast.info(`Acao em andamento: ${payload.status}`);
        }

        // Atualiza a pagina para refletir a nova grid de comandos e detalhes do host
        // O router.refresh() do Next.js 15 preserva o estado do cliente (scroll, inputs) 
        // mas atualiza o Server Component com o novo snapshot do banco.
        router.refresh();
      } catch (e) {
        console.error("Erro ao processar dados SSE ACK:", e);
      }
    });

    eventSource.onerror = (e) => {
      console.error("Erro na conexao SSE:", e);
      // O navegador tenta reconectar automaticamente para EventSource
    };

    return () => {
      eventSource.close();
      eventSourceRef.current = null;
    };
  }, [hostId, router]);

  return {
    isConnected: !!eventSourceRef.current && eventSourceRef.current.readyState === 1
  };
}
