import { notFound } from "next/navigation";
import { callWebApi } from "@/lib/web-api";
import type {
  CompanyAdminListViewData,
  CompanyEditViewData,
  CompanyOption,
} from "@/features/company/application/types";

async function apiRequest(path: string, init?: RequestInit) {
  return callWebApi(`/api${path}`, init);
}

export async function getCompaniesQuery(filters?: {
  search?: string;
  status?: string;
}) {
  const params = new URLSearchParams();
  if (filters?.search?.trim()) params.set("search", filters.search.trim());
  if (filters?.status && filters.status !== "ALL") params.set("status", filters.status);

  const response = await apiRequest(`/companies${params.toString() ? `?${params.toString()}` : ""}`);
  if (!response.ok) return [];
  return response.json();
}

export async function getCompanyOptionsAction(): Promise<CompanyOption[]> {
  const response = await apiRequest("/companies/options");
  if (!response.ok) return [];
  return response.json();
}

export async function getCadastrosCompaniesAdminViewData(): Promise<CompanyAdminListViewData | { error: string }> {
  try {
    const response = await apiRequest("/companies/view/admin");
    if (!response.ok) {
      return { error: "Erro ao buscar empresas." };
    }
    return (await response.json()) as CompanyAdminListViewData;
  } catch {
    return { error: "Erro ao buscar empresas." };
  }
}

export async function getCompanyEditViewData(companyId: string): Promise<CompanyEditViewData> {
  const response = await apiRequest(`/companies/${encodeURIComponent(companyId)}/edit-view`);
  if (!response.ok) notFound();
  return (await response.json()) as CompanyEditViewData;
}
