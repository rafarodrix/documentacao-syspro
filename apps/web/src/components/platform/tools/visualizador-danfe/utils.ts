import { formatDateTime } from "@/lib/date";
import { formatCurrency, formatNumber as sharedFormatNumber, formatPercent as sharedFormatPercent } from "@dosc-syspro/shared";

export { formatCurrency };

export const formatNumber = (v?: number | null) =>
  sharedFormatNumber(v, { minimumFractionDigits: 2, maximumFractionDigits: 4, fallback: "0,00" });

export const formatPercent = (v?: number | null) =>
  v != null ? sharedFormatPercent(v) : "-";

export const formatDate = (iso?: string) => {
  if (!iso) return '-';
  const res = formatDateTime(iso);
  return res === "-" ? "-" : res;
};
