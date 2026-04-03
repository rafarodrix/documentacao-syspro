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