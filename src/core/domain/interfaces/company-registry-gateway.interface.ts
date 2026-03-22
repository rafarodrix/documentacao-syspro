export type CompanyRegistryAddress = {
  cep?: string;
  street?: string;
  number?: string;
  complement?: string;
  district?: string;
  city?: string;
  state?: string;
  country?: string;
};

export type CompanyRegistryProfile = {
  cnpj: string;
  legalName: string;
  tradeName?: string;
  status?: string;
  openingDate?: string;
  primaryCnae?: string;
  primaryCnaeDescription?: string;
  email?: string;
  phone?: string;
  address?: CompanyRegistryAddress;
  raw?: unknown;
};

export interface ICompanyRegistryGateway {
  isConfigured(): boolean;
  getProviderLabel(): string;
  getProfileByCnpj(cnpj: string): Promise<CompanyRegistryProfile>;
}
