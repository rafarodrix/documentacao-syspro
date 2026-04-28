"use client";

import { useEffect, useState } from "react";
import { Activity, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { toast } from "sonner";

/**
 * Contador de sessoes ativas para o header do portal.
 * Escuta o stream SSE global e atualiza o estado em tempo real.
 */
export function RemoteActiveSessionsCounter({ initialCount = 0 }: { initialCount?: number }) {
  const [count, setCount] = useState(initialCount);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    // Configura o EventSource para o stream global de sessoes
    const eventSource = new EventSource("/api/remote/sessions/events");

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === "session_change") {
          setIsUpdating(true);
          
          // Atualiza o contador de forma inteligente baseada no status
          if (data.status === "REQUESTED" || data.status === "STARTED") {
            setCount(prev => prev + 1);
            if (data.status === "STARTED") {
              toast.info(`Sessão iniciada no host ${data.hostId}`, {
                description: data.ticketNumber ? `Ticket #${data.ticketNumber}` : undefined,
                icon: <Activity className="h-4 w-4 text-emerald-500" />
              });
            }
          } else if (data.status === "ENDED" || data.status === "FAILED" || data.status === "CANCELLED") {
            setCount(prev => Math.max(0, prev - 1));
          }

          setTimeout(() => setIsUpdating(false), 2000);
        }
      } catch (error) {
        console.error("Erro ao processar evento de sessao:", error);
      }
    };

    eventSource.onerror = (error) => {
      console.error("Erro no stream de sessoes remoto:", error);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, []);

  if (count === 0 && !isUpdating) return null;

  return (
    <Link 
      href="/portal/infraestrutura?tab=sessoes"
      className={cn(
        "flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-bold transition-all duration-500",
        count > 0 
          ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 animate-in zoom-in-95" 
          : "bg-muted/30 text-muted-foreground border-border/50",
        isUpdating && "ring-2 ring-emerald-500/30 ring-offset-1"
      )}
    >
      <div className={cn(
        "h-1.5 w-1.5 rounded-full",
        count > 0 ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground"
      )} />
      <Monitor className="h-3 w-3" />
      <span>{count} Sessões</span>
    </Link>
  );
}
