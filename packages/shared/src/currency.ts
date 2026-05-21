import { formatCurrency, parseCurrency } from "./formatters";

export const formatCurrencyBRL = (value: number | null | undefined): string => {
  return formatCurrency(value);
};

export const parseCurrencyBRL = (value: string): number => {
  return parseCurrency(value);
};