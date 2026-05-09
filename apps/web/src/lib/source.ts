import type { Role } from "@prisma/client";
import { docs } from "../../.source";
import { loader } from "fumadocs-core/source";
import { filterDocTree } from "@/lib/docs-tree-utils";
import { canRoleAccessDocsUrl } from "@/lib/docs-scope";

const baseUrl = "/portal/docs";

export const source = loader({
  baseUrl,
  source: docs.toFumadocsSource(),
});

type DocsSource = typeof source;

const sourceCache = new Map<string, DocsSource>();

export function createDocsSourceForRole(role: Role): DocsSource {
  const cacheKey = String(role);
  const cached = sourceCache.get(cacheKey);
  if (cached) return cached;

  const allow = (url: string) => canRoleAccessDocsUrl(role, url);
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
