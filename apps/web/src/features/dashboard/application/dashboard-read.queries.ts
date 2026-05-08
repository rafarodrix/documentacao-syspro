import {
  dashboardResponseSchema,
  adminOperacionalDataSchema,
  adminSuporteDataSchema,
  adminAtendimentosDataSchema,
  adminCadastrosDataSchema,
  adminComercialDataSchema,
  type DashboardView,
  type AdminOperacionalData,
  type AdminSuporteData,
  type AdminAtendimentosData,
  type AdminCadastrosData,
  type AdminComercialData,
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

async function fetchTabData<T>(path: string, schema: ZodType<T>): Promise<T> {
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

export function getOperacionalData(): Promise<AdminOperacionalData> {
  return fetchTabData("/api/dashboard/operacional", adminOperacionalDataSchema);
}

export function getSuporteData(): Promise<AdminSuporteData> {
  return fetchTabData("/api/dashboard/suporte", adminSuporteDataSchema);
}

export function getAtendimentosData(params?: {
  from?: string;
  to?: string;
  assigneeId?: string;
  contact?: string;
}): Promise<AdminAtendimentosData> {
  const query = new URLSearchParams();
  if (params?.from?.trim()) query.set("from", params.from.trim());
  if (params?.to?.trim()) query.set("to", params.to.trim());
  if (params?.assigneeId?.trim()) query.set("assigneeId", params.assigneeId.trim());
  if (params?.contact?.trim()) query.set("contact", params.contact.trim());
  const suffix = query.size ? `?${query.toString()}` : "";
  return fetchTabData(`/api/dashboard/suporte/atendimentos${suffix}`, adminAtendimentosDataSchema);
}

export function getCadastrosData(): Promise<AdminCadastrosData> {
  return fetchTabData("/api/dashboard/cadastros", adminCadastrosDataSchema);
}

export function getComercialData(): Promise<AdminComercialData> {
  return fetchTabData("/api/dashboard/comercial", adminComercialDataSchema);
}
