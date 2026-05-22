import type { IntegrationDiagnostics } from "./integrations.types";

export async function requestIntegrationDiagnostics(
  setDiagnostics: (value: IntegrationDiagnostics) => void,
  setIsLoading: (value: boolean) => void,
) {
  setIsLoading(true);
  try {
    const response = await fetch("/api/platform/settings/integrations/diagnostics", { method: "GET", cache: "no-store" });
    const json = (await response.json()) as IntegrationDiagnostics;
    setDiagnostics(json);
  } catch {
    setDiagnostics({ success: false, error: "Falha ao carregar diagnostico." });
  } finally {
    setIsLoading(false);
  }
}

export function formatRuntimeKey(key: string) {
  return key
    .replace(/^has/, "")
    .replace(/([A-Z])/g, " $1")
    .trim();
}
