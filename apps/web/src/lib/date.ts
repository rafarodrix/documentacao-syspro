import {
  formatRecency as sharedFormatRecency,
  formatDateTime as sharedFormatDateTime,
  formatDateShort as sharedFormatDateShort,
  formatDateLong as sharedFormatDateLong,
  formatTimeShort as sharedFormatTimeShort,
} from "@dosc-syspro/shared";

export {
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
  const parsed = parseDateLike(value);
  if (!parsed) return fallback;

  const diffMs = Date.now() - parsed.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMs < 60_000) return "agora";
  if (diffMin < 60) return `${diffMin}min atras`;
  if (diffHr < 24) return `${diffHr}h atras`;
  if (diffDay === 1) return "ontem";
  if (diffDay < 30) return `${diffDay} dias atras`;

  return formatDate(parsed, fallback);
}
