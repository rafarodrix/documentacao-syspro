"use client";

import { useEffect, useRef, useState } from "react";
import { Activity, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { toast } from "sonner";

async function fetchActiveSessionsCount(): Promise<number> {
  try {
    const res = await fetch("/api/remote/sessions/count");
    if (!res.ok) return 0;
    const data = await res.json();
    return typeof data.count === "number" ? data.count : 0;
  } catch {
    return 0;
  }
}

/**
 * Contador de sessoes ativas para o header do portal.
 * Escuta o stream SSE global e atualiza o estado em tempo real.
 * Reconecta automaticamente apos o timeout do Vercel (300s) e ressincroniza o contador.
 */
export function RemoteActiveSessionsCounter({ initialCount = 0 }: { initialCount?: number }) {
  const [count, setCount] = useState(initialCount);
  const [isUpdating, setIsUpdating] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    let destroyed = false;

    function connect() {
      if (destroyed) return;

      const eventSource = new EventSource("/api/remote/sessions/events");
      eventSourceRef.current = eventSource;

      eventSource.onopen = async () => {
        // Ressincroniza o contador ao (re)conectar para compensar eventos perdidos durante o intervalo
        const current = await fetchActiveSessionsCount();
        if (!destroyed) setCount(current);
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === "session_change") {
            setIsUpdating(true);

            if (data.status === "STARTED") {
              setCount((prev) => prev + 1);
              toast.info(`Sessão iniciada no host ${data.hostId}`, {
                description: data.ticketNumber ? `Ticket #${data.ticketNumber}` : undefined,
                icon: <Activity className="h-4 w-4 text-emerald-500" />,
              });
            } else if (data.status === "ENDED" || data.status === "FAILED" || data.status === "CANCELLED") {
              setCount((prev) => Math.max(0, prev - 1));
            }

            setTimeout(() => setIsUpdating(false), 2000);
          }
        } catch (error) {
          console.error("Erro ao processar evento de sessao:", error);
        }
      };

      // Nao fechar manualmente: o EventSource reconecta automaticamente quando a conexao cai
      // (incluindo o timeout de 300s do Vercel). O onopen ressincronizara o contador.
      eventSource.onerror = () => {
        if (process.env.NODE_ENV !== "production") {
          console.warn("Stream de sessoes remoto interrompido, reconectando...");
        }
      };
    }

    connect();

    return () => {
      destroyed = true;
      eventSourceRef.current?.close();
      eventSourceRef.current = null;
    };
  }, []);

  if (count === 0 && !isUpdating) return null;

  return (
    <Link
      href="/portal/infraestrutura?tab=operacao&view=ativas"
      className={cn(
        "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold transition-all duration-500",
        count > 0
          ? "animate-in zoom-in-95 border-emerald-500/20 bg-emerald-500/10 text-emerald-600"
          : "border-border/50 bg-muted/30 text-muted-foreground",
        isUpdating && "ring-2 ring-emerald-500/30 ring-offset-1",
      )}
    >
      <div
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          count > 0 ? "animate-pulse bg-emerald-500" : "bg-muted-foreground",
        )}
      />
      <Monitor className="h-3 w-3" />
      <span>{count} Sessões</span>
    </Link>
  );
}
