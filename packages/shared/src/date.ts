export function differenceInDays(
  dateLeft: Date | string,
  dateRight: Date | string,
  method: "floor" | "ceil" | "round" = "floor"
): number {
  const dLeft = typeof dateLeft === "string" ? new Date(dateLeft) : dateLeft;
  const dRight = typeof dateRight === "string" ? new Date(dateRight) : dateRight;
  if (isNaN(dLeft.getTime()) || isNaN(dRight.getTime())) return 0;
  const diffMs = dLeft.getTime() - dRight.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  if (method === "ceil") return Math.ceil(diffDays);
  if (method === "round") return Math.round(diffDays);
  return Math.floor(diffDays);
}

export function differenceInHours(
  dateLeft: Date | string,
  dateRight: Date | string,
  method: "floor" | "ceil" | "round" = "floor"
): number {
  const dLeft = typeof dateLeft === "string" ? new Date(dateLeft) : dateLeft;
  const dRight = typeof dateRight === "string" ? new Date(dateRight) : dateRight;
  if (isNaN(dLeft.getTime()) || isNaN(dRight.getTime())) return 0;
  const diffMs = dLeft.getTime() - dRight.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  if (method === "ceil") return Math.ceil(diffHours);
  if (method === "round") return Math.round(diffHours);
  return Math.floor(diffHours);
}

export function differenceInMinutes(
  dateLeft: Date | string,
  dateRight: Date | string
): number {
  const dLeft = typeof dateLeft === "string" ? new Date(dateLeft) : dateLeft;
  const dRight = typeof dateRight === "string" ? new Date(dateRight) : dateRight;
  if (isNaN(dLeft.getTime()) || isNaN(dRight.getTime())) return 0;
  return Math.floor((dLeft.getTime() - dRight.getTime()) / (1000 * 60));
}

export function differenceInSeconds(
  dateLeft: Date | string,
  dateRight: Date | string
): number {
  const dLeft = typeof dateLeft === "string" ? new Date(dateLeft) : dateLeft;
  const dRight = typeof dateRight === "string" ? new Date(dateRight) : dateRight;
  if (isNaN(dLeft.getTime()) || isNaN(dRight.getTime())) return 0;
  return Math.floor((dLeft.getTime() - dRight.getTime()) / 1000);
}

export function getStartOfDay(date: Date | string = new Date()): Date {
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return new Date(Number.NaN);
  const res = new Date(d);
  res.setHours(0, 0, 0, 0);
  return res;
}

export function formatRecency(isoDate: string): string {
  const now = getStartOfDay();
  const updateDate = getStartOfDay(isoDate);

  if (isNaN(updateDate.getTime())) return "Atualizacao indisponivel";

  const diffDays = differenceInDays(now, updateDate);

  if (diffDays === 0) return "Atualizado hoje";
  if (diffDays === 1) return "Atualizado ontem";
  if (diffDays <= 7) return `Atualizado há ${diffDays} dias`;

  const formattedDate = updateDate.toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  return `Atualizado em ${formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1)}`;
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "-";
  try {
    const d = typeof date === "string" ? new Date(date) : date;
    if (isNaN(d.getTime())) return "-";
    return d.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "-";
  }
}

export function formatDateShort(date: Date | string | null | undefined): string {
  if (!date) return "-";
  try {
    const d = typeof date === "string" ? new Date(date) : date;
    if (isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return "-";
  }
}

export function formatDateLong(date: Date | string | null | undefined): string {
  if (!date) return "-";
  try {
    const d = typeof date === "string" ? new Date(date) : date;
    if (isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  } catch {
    return "-";
  }
}

export function formatTimeShort(date: Date | string | null | undefined): string {
  if (!date) return "-";
  try {
    const d = typeof date === "string" ? new Date(date) : date;
    if (isNaN(d.getTime())) return "-";
    return d.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "-";
  }
}

export function formatRelativeDate(
  value: string | Date | null | undefined,
  fallback = "N/D"
): string {
  if (!value) return fallback;
  const parsed = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(parsed.getTime())) return fallback;

  const now = new Date();
  const diffMs = now.getTime() - parsed.getTime();
  if (diffMs < 60_000) return "agora";

  const diffMin = differenceInMinutes(now, parsed);
  if (diffMin < 60) return `${diffMin}min atrás`;

  const diffHr = differenceInHours(now, parsed);
  if (diffHr < 24) return `${diffHr}h atrás`;

  const diffDay = differenceInDays(now, parsed);
  if (diffDay === 1) return "ontem";
  if (diffDay < 30) return `${diffDay} dias atrás`;

  return formatDateShort(parsed) || fallback;
}

export function formatDurationBetween(
  start?: Date | string | null,
  end?: Date | string | null
): string | null {
  if (!start || !end) return null;
  const startedAt = new Date(start as string | Date);
  const endedAt = new Date(end as string | Date);
  if (Number.isNaN(startedAt.getTime()) || Number.isNaN(endedAt.getTime())) return null;
  const diffMs = Math.max(0, endedAt.getTime() - startedAt.getTime());
  const totalMinutes = Math.max(1, Math.round(diffMs / 60000));
  if (totalMinutes < 60) return `${totalMinutes} min`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes ? `${hours}h ${minutes}min` : `${hours}h`;
}
