/**
 * Chaves de localStorage usadas pelo módulo de documentação.
 *
 * Antes: strings literais espalhadas em 5 arquivos diferentes:
 *   DocsHomePage, DocsPageViewTracker, DocsSidebarItem,
 *   DocsSidebarQuickLinks, DocsLayoutClient.
 *
 * Agora: fonte única da verdade — qualquer renomeação acontece aqui.
 */
export const DOCS_STORAGE_KEYS = {
  /** Histórico de páginas visitadas recentemente (array de RecentDocItem) */
  recent: 'docs:recent',
  /** Mapa de páginas mais acessadas (Record<href, {title, count, lastVisited}>) */
  popular: 'docs:popular',
  /** Mapa de timestamps da última visita (Record<href, number>) */
  visited: 'docs:visited',
  /** Preferência de colapso do painel de atalhos na sidebar */
  quickLinksOpen: 'docs:quick-links:open',
  /** Modo de layout preferido para usuários ADMIN (docs | notebook) */
  adminLayout: 'docs:admin:layout-mode',
} as const;

export type DocsStorageKey = (typeof DOCS_STORAGE_KEYS)[keyof typeof DOCS_STORAGE_KEYS];

// ---------------------------------------------------------------------------
// Helpers tipados para leitura segura de localStorage
// ---------------------------------------------------------------------------

/**
 * Lê e faz parse de um valor do localStorage.
 * Retorna `fallback` em caso de ausência ou erro de parse.
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
 * Falha silenciosamente (ex.: storage cheio, modo privado).
 */
export function writeStorage(key: string, value: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // no-op
  }
}

// ---------------------------------------------------------------------------
// Tipos compartilhados de storage
// ---------------------------------------------------------------------------

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
