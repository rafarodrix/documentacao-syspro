import { cn as cnUi } from "@dosc-syspro/ui";
import {
  onlyDigits,
  normalizeCpf,
  normalizeCnpj,
  normalizeCep,
  normalizeNcm,
  normalizePhone,
} from "@dosc-syspro/shared";
import {
  formatDate,
  formatDateTimeSafe,
  formatRelativeDate as formatRelativeDateShared,
} from "./date";

export {
  onlyDigits,
  normalizeCpf,
  normalizeCnpj,
  normalizeCep,
  normalizeNcm,
  normalizePhone,
};

export function cn(...inputs: Parameters<typeof cnUi>) {
  return cnUi(...inputs);
}

export function formatDateSafe(
  date: string | Date | null | undefined,
  fallback = "N/D"
): string {
  return formatDate(date, fallback);
}

export function formatRelativeDate(date: string | Date | null | undefined): string {
  return formatRelativeDateShared(date);
}

export function formatAbsoluteDate(date: string | Date | null | undefined): string {
  return formatDateTimeSafe(date);
}
