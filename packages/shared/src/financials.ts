export interface ContractFinancialBreakdown {
  grossValue: number;
  taxDeduction: number;
  partnerDeduction: number;
  netValue: number;
}

export function calculateContractFinancials(
  minimumWage: number,
  percentage: number,
  taxRate: number,
  programmerRate: number
): ContractFinancialBreakdown {
  const grossValue = minimumWage * (percentage / 100);
  const taxDeduction = grossValue * (taxRate / 100);
  const partnerDeduction = grossValue * (programmerRate / 100);
  const netValue = grossValue - taxDeduction - partnerDeduction;

  return { grossValue, taxDeduction, partnerDeduction, netValue };
}
