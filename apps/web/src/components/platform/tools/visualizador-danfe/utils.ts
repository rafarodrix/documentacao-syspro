import { formatDateTime } from "@/lib/date";
import { formatCurrency } from "@/lib/formatters";

// components/danfe-visualizer/utils.ts
export { formatCurrency };
export const formatNumber = (v?: number | null) => v != null ? v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 }) : '0,00';
export const formatPercent = (v?: number | null) => (v != null ? `${v.toFixed(2)}%` : '-');
export const formatDate = (iso?: string) => {
  if (!iso) return '-';
  const res = formatDateTime(iso);
  return res === "-" ? "-" : res;
};
