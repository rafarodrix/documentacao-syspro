import { notFound } from "next/navigation";
import { callWebApi } from "@/lib/web-api";
import { companyListResponseSchema } from "@dosc-syspro/contracts/company";
import type {
  CompanyEditViewData,
  CompanyListResponse,
  CompanyOption,
} from "@/features/company/application/company-view.types";

async function apiRequest(path: string, init?: RequestInit) {
  return callWebApi(`/api${path}`, init);
}

export async function getCompaniesQuery(filters?: {
  search?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}) {
  const params = new URLSearchParams();
  if (filters?.search?.trim()) params.set("search", filters.search.trim());
  if (filters?.status && filters.status !== "ALL") params.set("status", filters.status);
  if (filters?.page) params.set("page", String(filters.page));
  if (filters?.pageSize) params.set("pageSize", String(filters.pageSize));

  const response = await apiRequest(`/companies${params.toString() ? `?${params.toString()}` : ""}`);
  if (!response.ok) {
    return null;
  }

  return companyListResponseSchema.parse(await response.json()) as CompanyListResponse;
}

export async function getCompanyOptionsAction(): Promise<CompanyOption[]> {
  const response = await apiRequest("/companies/options");
  if (!response.ok) return [];
  return response.json();
}

export async function getCadastrosCompaniesAdminViewData(filters?: {
  search?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ isGlobalView: boolean; list: CompanyListResponse } | { error: string }> {
  try {
    const [response, list] = await Promise.all([
      apiRequest("/companies/view/admin"),
      getCompaniesQuery(filters),
    ]);
    if (!response.ok) {
      return { error: "Erro ao buscar empresas." };
    }
    if (!list) {
      return { error: "Erro ao buscar empresas." };
    }

    const adminView = await response.json() as { isGlobalView: boolean };
    return { isGlobalView: adminView.isGlobalView, list };
  } catch {
    return { error: "Erro ao buscar empresas." };
  }
}

export async function getCompanyEditViewData(companyId: string): Promise<CompanyEditViewData> {
  const response = await apiRequest(`/companies/${encodeURIComponent(companyId)}/edit-view`);
  if (!response.ok) notFound();
  return (await response.json()) as CompanyEditViewData;
}
