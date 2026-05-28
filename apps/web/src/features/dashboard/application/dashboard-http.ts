import {
  dashboardResponseSchema,
  type DashboardView,
} from "@dosc-syspro/contracts/dashboard";
import { callWebApi } from "@/lib/web-api";
import type { ZodType } from "zod";

export async function getDashboardData(): Promise<DashboardView> {
  const res = await callWebApi("/api/dashboard");
  const payload = await res.json().catch(() => null);

  if (!res.ok) {
    const error =
      payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string"
        ? payload.error
        : `Falha HTTP ${res.status} ao carregar dashboard.`;
    throw new Error(error);
  }

  const response = dashboardResponseSchema.parse(payload);

  if (!response.success || !response.data) {
    throw new Error(response.error || "Falha ao carregar dashboard.");
  }

  return response.data;
}

export async function fetchDashboardTabData<T>(path: string, schema: ZodType<T>): Promise<T> {
  const res = await callWebApi(path);
  const payload = await res.json().catch(() => null);

  if (!res.ok) {
    const error =
      payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string"
        ? payload.error
        : `Falha HTTP ${res.status}`;
    throw new Error(error);
  }

  return schema.parse(payload.data);
}
