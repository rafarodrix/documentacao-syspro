import type { Role } from "@prisma/client";
import { docs } from "../../.source";
import { loader } from "fumadocs-core/source";
import { filterDocTree } from "@/lib/docs-tree-utils";
import { canRoleAccessDocsUrl, getDocScopeFromUrl, type DocsScope } from "@/lib/docs-scope";

const baseUrl = "/portal/docs";

export const source = loader({
  baseUrl,
  source: docs.toFumadocsSource(),
});

type DocsSource = typeof source;

const sourceCache = new Map<string, DocsSource>();

export function createDocsSourceForRole(role: Role, scope?: DocsScope | null): DocsSource {
  const normalizedScope = scope ?? null;
  const cacheKey = normalizedScope ? `${String(role)}:${normalizedScope}` : String(role);
  const cached = sourceCache.get(cacheKey);
  if (cached) return cached;

  const allow = (url: string) => {
    if (!canRoleAccessDocsUrl(role, url)) {
      return false;
    }

    if (!normalizedScope) {
      return true;
    }

    return getDocScopeFromUrl(url) === normalizedScope;
  };
  const scopedSource: DocsSource = {
    ...source,
    pageTree: filterDocTree(source.pageTree, allow),
    getPageTree(locale) {
      return filterDocTree(source.getPageTree(locale), allow);
    },
    getPages(language) {
      return source.getPages(language).filter((page) => allow(page.url));
    },
    getPage(slugs, language) {
      const page = source.getPage(slugs, language);
      if (!page || !allow(page.url)) return undefined;
      return page;
    },
    getPageByHref(href, options) {
      const result = source.getPageByHref(href, options);
      if (!result || !allow(result.page.url)) return undefined;
      return result;
    },
    getNodePage(node, language) {
      const page = source.getNodePage(node, language);
      if (!page || !allow(page.url)) return undefined;
      return page;
    },
    getLanguages() {
      return source.getLanguages().map((entry) => ({
        ...entry,
        pages: entry.pages.filter((page) => allow(page.url)),
      }));
    },
  };

  sourceCache.set(cacheKey, scopedSource);
  return scopedSource;
}
