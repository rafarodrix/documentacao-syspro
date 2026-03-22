export interface ContractCompanyOption {
  id: string;
  razaoSocial: string;
  cnpj: string;
}

export interface ContractSuspendImpact {
  companyName: string;
  willBlockCompany: boolean;
  blockedUsersCount: number;
  totalLinkedUsers: number;
}

export interface ContractsAdminViewData {
  contracts: unknown[];
  companies: ContractCompanyOption[];
}
