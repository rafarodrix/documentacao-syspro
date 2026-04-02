import type { CompanyStatus } from "@prisma/client";
import type { CreateCompanyInput } from "@dosc-syspro/contracts/company";
import type {
  CompanyActionResponse,
  CompanyRegistryLookupResponse,
  CompanyZammadEmailInput,
} from "@/features/company/domain/model";

export interface CompanyWriteRepository {
  lookupCompanyProfileByCnpj(
    cnpj: string,
  ): Promise<CompanyActionResponse<CompanyRegistryLookupResponse>>;
  createCompany(
    data: CreateCompanyInput,
    zammadEmails?: CompanyZammadEmailInput[],
  ): Promise<CompanyActionResponse>;
  updateCompany(
    id: string,
    data: CreateCompanyInput,
    zammadEmails?: CompanyZammadEmailInput[],
  ): Promise<CompanyActionResponse>;
  updateCompanyStatus(id: string, status: CompanyStatus): Promise<CompanyActionResponse>;
  deleteCompany(id: string): Promise<CompanyActionResponse>;
}


