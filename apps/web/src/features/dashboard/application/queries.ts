import { dashboardResponseSchema, type DashboardView } from "@dosc-syspro/contracts/dashboard";
import { callWebApi } from "@/lib/web-api";

export async function getDashboardData(): Promise<DashboardView> {
  const response = dashboardResponseSchema.parse(
    await callWebApi("/api/dashboard").then((res) => res.json()),
  );

  if (!response.success || !response.data) {
    throw new Error(response.error || "Falha ao carregar dashboard.");
  }

  return response.data;
}
