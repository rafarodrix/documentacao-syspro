"use client";

import { useEffect } from "react";
import { ProtectedRouteError } from "@/components/platform/shared/ProtectedRouteError";

export default function AppProtectedError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App protected route error:", error);
  }, [error]);

  return (
    <ProtectedRouteError
      title="Falha na area logada"
      message="Nao foi possivel concluir a acao nesta tela. Tente novamente."
      onRetry={reset}
    />
  );
}

