import type {
  CompanyAdminListViewData,
  CompanyEditViewData,
  CompanyListItem,
  CompanyOption,
} from "@/features/company/application/company-view.types";

export type CompanyListFilters = {
  search?: string;
  status?: string;
};

export interface CompanyReadContract {
  listCompanies(filters?: CompanyListFilters): Promise<CompanyListItem[]>;
  listCompanyOptions(): Promise<CompanyOption[]>;
  getAdminListView(): Promise<CompanyAdminListViewData | { error: string }>;
  getEditView(companyId: string): Promise<CompanyEditViewData>;
}
