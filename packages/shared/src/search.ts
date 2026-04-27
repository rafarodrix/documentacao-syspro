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

export type { NormalizeSearchTextOptions };
