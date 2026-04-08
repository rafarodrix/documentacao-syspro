import type {
  CompanyAdminListViewData,
  CompanyEditViewData,
  CompanyListItem,
  CompanyOption,
  CompanyTicketEmailInput,
} from "@/features/company/domain/model";

export type CompanyListFilters = {
  search?: string;
  status?: string;
};

export interface CompanyReadRepository {
  listCompanies(filters?: CompanyListFilters): Promise<CompanyListItem[]>;
  listCompanyOptions(): Promise<CompanyOption[]>;
  listCompanyTicketEmails(companyId: string): Promise<CompanyTicketEmailInput[]>;
  getAdminListView(): Promise<CompanyAdminListViewData | { error: string }>;
  getEditView(companyId: string): Promise<CompanyEditViewData>;
}
