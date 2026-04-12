import { dashboardResponseSchema, type DashboardView } from "@dosc-syspro/contracts";
import { callBackendApi } from "@/lib/backend-api-client";

export async function getDashboardData(): Promise<DashboardView> {
  const response = dashboardResponseSchema.parse(
    await callBackendApi("dashboard", ""),
  );

  if (!response.success || !response.data) {
    throw new Error(response.error || "Falha ao carregar dashboard.");
  }

  return response.data;
}
