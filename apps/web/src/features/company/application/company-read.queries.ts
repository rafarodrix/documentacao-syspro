import { trpc } from "@/lib/api/trpc-client";
import type {
  CompanyAdminView,
  CompanyCockpitViewData,
  CompanyEditViewData,
  CompanyListResponse,
  CompanyOption,
} from "@/features/company/application/company-view.types";

export async function getCompaniesQuery(filters?: {
  search?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}) {
  try {
    return (await trpc.companies.list.query({
      search: filters?.search?.trim() || undefined,
      status: filters?.status && filters.status !== "ALL" ? (filters.status as any) : undefined,
      page: filters?.page ? String(filters.page) : undefined,
      pageSize: filters?.pageSize ? String(filters.pageSize) : undefined,
    })) as CompanyListResponse;
  } catch {
    return null;
  }
}

export async function getCompanyOptionsQuery(): Promise<CompanyOption[]> {
  try {
    return (await trpc.companies.getOptions.query()) as CompanyOption[];
  } catch {
    return [];
  }
}

export async function getCadastrosCompaniesAdminViewData(filters?: {
  search?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ isGlobalView: boolean; list: CompanyListResponse } | { error: string }> {
  try {
    const [adminView, list] = await Promise.all([
      trpc.companies.getAdminView.query() as Promise<CompanyAdminView>,
      getCompaniesQuery(filters),
    ]);
    
    if (!list) {
      return { error: "Erro ao buscar empresas." };
    }

    return { isGlobalView: adminView.isGlobalView, list };
  } catch {
    return { error: "Erro ao buscar empresas." };
  }
}

export async function getCompanyEditViewData(companyId: string): Promise<CompanyEditViewData> {
  return (await trpc.companies.getEditView.query({ id: companyId })) as CompanyEditViewData;
}

export async function getCompanyCockpitViewData(companyId: string): Promise<CompanyCockpitViewData> {
  return (await trpc.companies.getCockpitView.query({ id: companyId })) as CompanyCockpitViewData;
}
