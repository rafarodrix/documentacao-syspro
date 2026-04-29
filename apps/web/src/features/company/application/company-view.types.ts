import type {
  CompanyListItem,
  CreateCompanyInput,
} from "@dosc-syspro/contracts/company";

export type CompanyValidationErrors = Partial<Record<keyof CreateCompanyInput, string[]>>;

export type CompanyActionSuccess<T = void> = T extends void
  ? { success: true; message?: string }
  : { success: true; message?: string; data: T };

export type CompanyActionFailure<T = void> = {
  success: false;
  message: string;
  errors?: CompanyValidationErrors;
} & (T extends void ? {} : { data?: T });

export type CompanyActionResponse<T = void> = CompanyActionSuccess<T> | CompanyActionFailure<T>;
export type {
  CompanyAddressView,
  CompanyEditViewData,
  CompanyListItem,
  CompanyListResponse,
  CompanyOption,
  CompanyRegistryLookupResponse,
} from "@dosc-syspro/contracts/company";

export interface CompanyAdminListViewData {
  companies: CompanyListItem[];
  isGlobalView: boolean;
}
