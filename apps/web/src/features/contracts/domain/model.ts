import type { ContractStatus } from "@prisma/client";

export type ContractActionSuccess<T = void> = T extends void
  ? {
      success: true;
      message?: string;
    }
  : {
      success: true;
      message?: string;
      data: T;
    };

export type ContractActionFailure = {
  success: false;
  error: string;
};

export type ContractActionResponse<T = void> = ContractActionSuccess<T> | ContractActionFailure;

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

export interface ContractListItem {
  id: string;
  companyId: string;
  percentage: number | string;
  minimumWage: number | string;
  taxRate: number | string;
  programmerRate: number | string;
  contractNumber?: string | null;
  notes?: string | null;
  status: ContractStatus;
  startDate: string | Date;
  endDate?: string | Date | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  company: {
    id: string;
    razaoSocial: string;
    cnpj: string;
  };
}

export interface ContractsAdminViewData {
  contracts: ContractListItem[];
  companies: ContractCompanyOption[];
}

export interface ContractSystemParams {
  minimumWage: number;
}
