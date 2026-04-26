import type { CompanyStatusValue, CreateCompanyInput } from "@dosc-syspro/contracts/company";
import type {
  CompanyActionResponse,
  CompanyRegistryLookupResponse,
} from "@/features/company/domain/model";

export interface CompanyWriteRepository {
  lookupCompanyProfileByCnpj(
    cnpj: string,
  ): Promise<CompanyActionResponse<CompanyRegistryLookupResponse>>;
  createCompany(data: CreateCompanyInput): Promise<CompanyActionResponse>;
  updateCompany(id: string, data: CreateCompanyInput): Promise<CompanyActionResponse>;
  updateCompanyStatus(id: string, status: CompanyStatusValue): Promise<CompanyActionResponse>;
  deleteCompany(id: string): Promise<CompanyActionResponse>;
}


