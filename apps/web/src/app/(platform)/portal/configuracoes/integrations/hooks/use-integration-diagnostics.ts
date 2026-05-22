import { useEffect, useState } from "react";
import type { IntegrationDiagnostics } from "../integrations.types";
import { requestIntegrationDiagnostics } from "../integrations.helpers";

export function useIntegrationDiagnostics() {
  const [diagnostics, setDiagnostics] = useState<IntegrationDiagnostics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void requestIntegrationDiagnostics(setDiagnostics, setIsLoading);
  }, []);

  return {
    diagnostics,
    isLoading,
    reload: () => requestIntegrationDiagnostics(setDiagnostics, setIsLoading),
  };
}
