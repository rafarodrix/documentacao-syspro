import { cn as cnUi } from "@dosc-syspro/ui";

export function cn(...inputs: Parameters<typeof cnUi>) {
  return cnUi(...inputs);
}

/**
 * Formata uma data de forma segura para PT-BR.
 * Retorna fallback se a data for invalida ou nula.
 */
export function formatDateSafe(
  date: string | Date | null | undefined,
  fallback = "N/D"
): string {
  if (!date) return fallback;
  try {
    const d = typeof date === "string" ? new Date(date) : date;
    if (isNaN(d.getTime())) return fallback;
    return d.toLocaleDateString("pt-BR");
  } catch {
    return fallback;
  }
}

export function formatRelativeDate(date: string | Date | null | undefined): string {
  if (!date) return "N/D";
  try {
    const d = typeof date === "string" ? new Date(date) : date;
    if (isNaN(d.getTime())) return "N/D";
    const diffMs = Date.now() - d.getTime();
    const diffMin = Math.floor(diffMs / 60_000);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);
    if (diffMs < 60_000) return "agora";
    if (diffMin < 60) return `${diffMin}min atrás`;
    if (diffHr < 24) return `${diffHr}h atrás`;
    if (diffDay === 1) return "ontem";
    if (diffDay < 30) return `${diffDay} dias atrás`;
    return d.toLocaleDateString("pt-BR");
  } catch {
    return "N/D";
  }
}

export function formatAbsoluteDate(date: string | Date | null | undefined): string {
  if (!date) return "N/D";
  try {
    const d = typeof date === "string" ? new Date(date) : date;
    if (isNaN(d.getTime())) return "N/D";
    return d.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "N/D";
  }
}