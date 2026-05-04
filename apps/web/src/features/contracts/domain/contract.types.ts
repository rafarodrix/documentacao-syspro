import type {
  ContractCompanyOption as SharedContractCompanyOption,
  ContractListItem as SharedContractListItem,
  ContractSuspendImpact as SharedContractSuspendImpact,
  ContractSystemParams as SharedContractSystemParams,
  ContractsAdminView as SharedContractsAdminView,
} from "@dosc-syspro/contracts/contract";

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

export type ContractCompanyOption = SharedContractCompanyOption;
export type ContractSuspendImpact = SharedContractSuspendImpact;
export type ContractListItem = SharedContractListItem;
export type ContractsAdminViewData = SharedContractsAdminView;
export type ContractSystemParams = SharedContractSystemParams;
