"use server";

export {
  createCompanyAction,
  deleteCompanyAction,
  lookupCompanyProfileByCnpjAction,
  updateCompanyAction,
  updateCompanyStatusAction,
} from "@/actions/platform/company-actions";

export type {
  ActionResponse as CompanyActionResponse,
  CompanyRegistryLookupResponse,
  CompanyZammadEmailInput,
} from "@/actions/platform/company-actions";
