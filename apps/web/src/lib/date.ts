import {
  differenceInDays,
  differenceInHours,
  differenceInMinutes,
  differenceInSeconds,
  getStartOfDay,
  formatRecency as sharedFormatRecency,
  formatDateTime as sharedFormatDateTime,
  formatDateShort as sharedFormatDateShort,
  formatDateLong as sharedFormatDateLong,
  formatTimeShort as sharedFormatTimeShort,
  formatRelativeDate as sharedFormatRelativeDate,
} from "@dosc-syspro/shared";

export {
  differenceInDays,
  differenceInHours,
  differenceInMinutes,
  differenceInSeconds,
  getStartOfDay,
  sharedFormatRecency as formatRecency,
  sharedFormatDateTime as formatDateTime,
  sharedFormatDateShort as formatDateShort,
  sharedFormatDateLong as formatDateLong,
  sharedFormatTimeShort as formatTimeShort,
};

type DateLike = string | Date | null | undefined;

function parseDateLike(value: DateLike) {
  if (!value) return null;
  const parsed = typeof value === "string" ? new Date(value) : value;
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatDate(value: DateLike, fallback = "N/D") {
  const parsed = parseDateLike(value);
  if (!parsed) return fallback;
  const res = sharedFormatDateShort(parsed);
  return res === "-" ? fallback : res;
}

export function formatDateTimeSafe(value: DateLike, fallback = "N/D") {
  const parsed = parseDateLike(value);
  if (!parsed) return fallback;
  const res = sharedFormatDateTime(parsed);
  return res === "-" ? fallback : res;
}

export function formatRelativeDate(value: DateLike, fallback = "N/D") {
  return sharedFormatRelativeDate(value, fallback);
}
