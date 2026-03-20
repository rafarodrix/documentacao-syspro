"use client";

import { AlertTriangle } from "lucide-react";

type ProtectedRouteErrorProps = {
  title?: string;
  message?: string;
  onRetry: () => void;
};

export function ProtectedRouteError({
  title = "Erro ao carregar a pagina",
  message = "Ocorreu uma falha inesperada. Tente novamente.",
  onRetry,
}: ProtectedRouteErrorProps) {
  return (
    <div className="min-h-[60vh] w-full flex items-center justify-center p-6">
      <div className="w-full max-w-lg rounded-xl border border-border/60 bg-card p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">{title}</h2>
            <p className="text-sm text-muted-foreground">{message}</p>
          </div>
        </div>

        <div className="mt-5">
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    </div>
  );
}

