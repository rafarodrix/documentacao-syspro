"use client";

import { useEffect } from "react";
import { Button } from "@dosc-syspro/ui";

interface ChamadosErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ChamadosError({ error, reset }: ChamadosErrorProps) {
  useEffect(() => {
    console.error("[TicketsDiag][route-error]", {
      at: new Date().toISOString(),
      message: error.message,
      stack: error.stack,
      digest: error.digest,
      pathname: "/portal/tickets",
    });
  }, [error]);

  return (
    <div className="mx-auto mt-12 max-w-lg rounded-xl border border-border/60 bg-card/70 p-6 text-center shadow-sm">
      <h2 className="text-xl font-semibold text-foreground">Falha ao carregar chamados</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Nao foi possivel concluir esta acao em /portal/tickets.
      </p>
      <Button className="mt-5" onClick={reset}>
        Tentar novamente
      </Button>
    </div>
  );
}

