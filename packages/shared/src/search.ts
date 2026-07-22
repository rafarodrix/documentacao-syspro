type NormalizeSearchTextOptions = {
  preserveSeparators?: boolean;
};

export function normalizeSearchText(value: string | null | undefined, options: NormalizeSearchTextOptions = {}) {
  const { preserveSeparators = true } = options;
  const disallowedPattern = preserveSeparators ? /[^\p{L}\p{N}\s|/-]/gu : /[^\p{L}\p{N}\s]/gu;

  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(disallowedPattern, " ")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function includesNormalizedSearch(
  haystack: string | null | undefined,
  query: string | null | undefined,
  options?: NormalizeSearchTextOptions,
) {
  const normalizedQuery = normalizeSearchText(query, options);
  if (!normalizedQuery) return true;
  return normalizeSearchText(haystack, options).includes(normalizedQuery);
}

export function buildSearchText(parts: Array<string | null | undefined>, options?: NormalizeSearchTextOptions) {
  return normalizeSearchText(parts.filter(Boolean).join(" "), options);
}

export function normalizeDigits(value: string | null | undefined): string {
  return String(value ?? "").replace(/\D/g, "");
}

export function normalizeCnpjDigits(value: string | null | undefined): string {
  return normalizeDigits(value);
}

export function normalizeRustDeskIdDigits(value: string | null | undefined): string {
  return normalizeDigits(value);
}

export function formatCnpj(value: string | null | undefined): string {
  const digits = normalizeDigits(value);
  if (digits.length !== 14) return String(value ?? "").trim();
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`;
}

export function formatRustDeskDisplay(value: string | null | undefined): string {
  const compact = normalizeDigits(value);
  if (!compact) return String(value ?? "").trim();
  if (compact.length === 9) {
    return `${compact.slice(0, 3)} ${compact.slice(3, 6)} ${compact.slice(6, 9)}`;
  }
  return compact.replace(/(\d{3})(?=\d)/g, "$1 ").trim();
}

export type { NormalizeSearchTextOptions };
