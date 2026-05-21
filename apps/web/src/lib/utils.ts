import { cn as cnUi } from "@dosc-syspro/ui";
import {
  formatDate,
  formatDateTimeSafe,
  formatRelativeDate as formatRelativeDateShared,
} from "./date";

export function cn(...inputs: Parameters<typeof cnUi>) {
  return cnUi(...inputs);
}

export function onlyDigits(value: string | number | null | undefined) {
  return String(value ?? "").replace(/\D/g, "");
}

export function normalizeCpf(value: string | number | null | undefined) {
  return onlyDigits(value).slice(0, 11);
}

export function normalizeCnpj(value: string | number | null | undefined) {
  return onlyDigits(value).slice(0, 14);
}

export function normalizeCep(value: string | number | null | undefined) {
  return onlyDigits(value).slice(0, 8);
}

export function normalizeNcm(value: string | number | null | undefined) {
  return onlyDigits(value).slice(0, 8);
}

export function normalizePhone(value: string | number | null | undefined) {
  return onlyDigits(value);
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
