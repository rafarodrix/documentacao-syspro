/**
 * Chaves de localStorage usadas pelo modulo de documentacao.
 *
 * Fonte unica da verdade para evitar strings literais espalhadas no modulo.
 */
export const DOCS_STORAGE_KEYS = {
  /** Historico de paginas visitadas recentemente (array de RecentDocItem) */
  recent: 'docs:recent',
  /** Mapa de paginas mais acessadas (Record<href, {title, count, lastVisited}>) */
  popular: 'docs:popular',
  /** Mapa de timestamps da ultima visita (Record<href, number>) */
  visited: 'docs:visited',
} as const;

export type DocsStorageKey = (typeof DOCS_STORAGE_KEYS)[keyof typeof DOCS_STORAGE_KEYS];

/**
 * Le e faz parse de um valor do localStorage.
 * Retorna `fallback` em caso de ausencia ou erro de parse.
 */
export function readStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/**
 * Serializa e persiste um valor no localStorage.
 * Falha silenciosamente em caso de erro.
 */
export function writeStorage(key: string, value: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // no-op
  }
}

export type RecentDocItem = {
  href: string;
  title: string;
  visitedAt: number;
};

export type PopularEntry = {
  title: string;
  count: number;
  lastVisited: number;
};

export type PopularMap = Record<string, PopularEntry>;
export type VisitedMap = Record<string, number>;
