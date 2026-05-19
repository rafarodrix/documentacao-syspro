import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve, relative } from "node:path";

const ROOT = resolve(process.cwd(), "content", "docs");
const DOCS_BASE_PATH = "/portal/docs";
const MDX_EXTENSION = ".mdx";
const SEPARATOR_RE = /^---.*---$/;
const NON_ASCII_OR_SPACE_RE = /[^\x00-\x7F]|\s/;
const ALLOWED_STATUS = new Set(["draft", "review", "published", "archived"]);

const errors = [];
const warnings = [];

function walk(dir, predicate) {
  const result = [];
  for (const name of readdirSync(dir)) {
    const fullPath = join(dir, name);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      result.push(...walk(fullPath, predicate));
      continue;
    }
    if (predicate(fullPath)) result.push(fullPath);
  }
  return result;
}

function readJson(filePath) {
  try {
    return JSON.parse(readFileSync(filePath, "utf8"));
  } catch (error) {
    errors.push(`JSON invalido: ${relative(process.cwd(), filePath)} (${error.message})`);
    return null;
  }
}

function readText(filePath) {
  return readFileSync(filePath, "utf8");
}

function checkMdxFrontmatter(mdxFiles) {
  for (const filePath of mdxFiles) {
    const text = readText(filePath);
    if (!/^---\s*$/m.test(text)) {
      errors.push(`Frontmatter ausente: ${relative(process.cwd(), filePath)}`);
      continue;
    }
    if (!/^title:\s*.+$/m.test(text)) {
      errors.push(`Frontmatter sem title: ${relative(process.cwd(), filePath)}`);
    }
    if (!/^description:\s*.+$/m.test(text)) {
      errors.push(`Frontmatter sem description: ${relative(process.cwd(), filePath)}`);
    }
    if (!/^lastUpdated:\s*.+$/m.test(text)) {
      errors.push(`Frontmatter sem lastUpdated: ${relative(process.cwd(), filePath)}`);
    }
    if (!/^owner:\s*.+$/m.test(text)) {
      errors.push(`Frontmatter sem owner: ${relative(process.cwd(), filePath)}`);
    }
    if (!/^status:\s*.+$/m.test(text)) {
      errors.push(`Frontmatter sem status: ${relative(process.cwd(), filePath)}`);
    } else {
      const statusMatch = text.match(/^status:\s*["']?([a-z-]+)["']?$/m);
      if (statusMatch && !ALLOWED_STATUS.has(statusMatch[1])) {
        errors.push(
          `Frontmatter status invalido em ${relative(process.cwd(), filePath)}: ${statusMatch[1]} (use draft/review/published/archived)`,
        );
      }
    }
    if (!/^tags:\n\s+-\s+\S/m.test(text)) {
      errors.push(`Frontmatter sem tags: ${relative(process.cwd(), filePath)}`);
    }
  }
}

function checkNonMdxInContent(allFiles) {
  const ALLOWED_EXTENSIONS = new Set([".mdx", ".json"]);
  for (const filePath of allFiles) {
    const ext = filePath.slice(filePath.lastIndexOf("."));
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      errors.push(
        `Arquivo nao permitido em content/docs (mover para src/): ${relative(process.cwd(), filePath)}`,
      );
    }
  }
}

function routeFromMdx(filePath) {
  const rel = relative(ROOT, filePath).replace(/\\/g, "/");
  const noExt = rel.replace(/\.mdx$/, "");
  const route =
    noExt === "index"
      ? DOCS_BASE_PATH
      : noExt.endsWith("/index")
        ? `${DOCS_BASE_PATH}/${noExt.slice(0, -"/index".length)}`
        : `${DOCS_BASE_PATH}/${noExt}`;
  return normalizeRoute(route);
}

function normalizeRoute(route) {
  if (!route) return route;
  let value = route.split("#")[0].split("?")[0];
  if (!value.startsWith("/")) value = `/${value}`;
  if (value !== "/" && value.endsWith("/")) value = value.slice(0, -1);
  return value;
}

function resolveRelativeRoute(currentRoute, href) {
  const currentSegments = currentRoute.replace(/^\/+/, "").split("/");
  if (currentSegments.length > 0) currentSegments.pop();

  const hrefSegments = href.split("/");
  for (const segment of hrefSegments) {
    if (!segment || segment === ".") continue;
    if (segment === "..") {
      if (currentSegments.length > 0) currentSegments.pop();
      continue;
    }
    currentSegments.push(segment);
  }
  return normalizeRoute(`/${currentSegments.join("/")}`);
}

function extractLinks(text) {
  const noCodeBlocks = text.replace(/```[\s\S]*?```/g, "");
  const links = [];

  const markdownRe = /\[[^\]]*?\]\(([^)\s]+(?:\s+"[^"]*")?)\)/g;
  let markdownMatch;
  while ((markdownMatch = markdownRe.exec(noCodeBlocks)) !== null) {
    const raw = markdownMatch[1].trim();
    const href = raw.split(/\s+"/)[0];
    links.push(href);
  }

  const htmlRe = /href=["']([^"']+)["']/g;
  let htmlMatch;
  while ((htmlMatch = htmlRe.exec(noCodeBlocks)) !== null) {
    links.push(htmlMatch[1].trim());
  }

  return links;
}

function checkInternalMdxLinks(mdxFiles) {
  const validRoutes = new Set(mdxFiles.map(routeFromMdx));

  for (const filePath of mdxFiles) {
    const text = readText(filePath);
    const currentRoute = routeFromMdx(filePath);
    const relPath = relative(process.cwd(), filePath);
    const links = extractLinks(text);

    for (const href of links) {
      if (!href) continue;
      if (href.startsWith("#")) continue;
      if (/^(https?:|mailto:|tel:)/i.test(href)) continue;

      let targetRoute = "";
      if (href.startsWith(DOCS_BASE_PATH)) {
        targetRoute = normalizeRoute(href);
      } else if (href.startsWith("./") || href.startsWith("../")) {
        targetRoute = resolveRelativeRoute(currentRoute, href);
      } else {
        continue;
      }

      if (!targetRoute.startsWith(DOCS_BASE_PATH)) continue;
      if (!validRoutes.has(targetRoute)) {
        errors.push(`Link interno quebrado em ${relPath}: ${href} -> ${targetRoute}`);
      }
    }
  }
}

function checkMetaReferences(metaFiles) {
  for (const filePath of metaFiles) {
    const meta = readJson(filePath);
    if (!meta || !Array.isArray(meta.pages)) continue;

    const seen = new Set();
    const dir = filePath.replace(/meta\.json$/i, "");

    for (const page of meta.pages) {
      if (typeof page !== "string") {
        errors.push(`Entrada de page invalida em ${relative(process.cwd(), filePath)}: ${String(page)}`);
        continue;
      }
      if (SEPARATOR_RE.test(page)) continue;

      if (seen.has(page)) {
        errors.push(`Entrada duplicada em ${relative(process.cwd(), filePath)}: ${page}`);
        continue;
      }
      seen.add(page);

      const mdxPath = join(dir, `${page}${MDX_EXTENSION}`);
      const folderPath = join(dir, page);
      const hasMdx = exists(mdxPath);
      const hasFolder = exists(folderPath) && statSync(folderPath).isDirectory();

      if (!hasMdx && !hasFolder) {
        errors.push(
          `Referencia quebrada em ${relative(process.cwd(), filePath)}: ${page} (esperado ${relative(
            process.cwd(),
            mdxPath,
          )} ou pasta ${relative(process.cwd(), folderPath)})`,
        );
      }
    }
  }
}

function exists(path) {
  try {
    statSync(path);
    return true;
  } catch {
    return false;
  }
}

function checkFileNaming(files) {
  for (const filePath of files) {
    const rel = relative(ROOT, filePath);
    if (NON_ASCII_OR_SPACE_RE.test(rel)) {
      warnings.push(`Nome de arquivo/pasta fora do padrao (ASCII + kebab-case): ${rel}`);
    }
  }
}

function main() {
  const mdxFiles = walk(ROOT, (filePath) => filePath.endsWith(MDX_EXTENSION));
  const metaFiles = walk(ROOT, (filePath) => filePath.endsWith("meta.json"));
  const allFiles = walk(ROOT, () => true);

  checkMdxFrontmatter(mdxFiles);
  checkMetaReferences(metaFiles);
  checkInternalMdxLinks(mdxFiles);
  checkFileNaming(allFiles);
  checkNonMdxInContent(allFiles);

  if (warnings.length > 0) {
    console.log("Avisos de documentacao:");
    for (const item of warnings) console.log(`- ${item}`);
    console.log("");
  }

  if (errors.length > 0) {
    console.error("Erros de documentacao:");
    for (const item of errors) console.error(`- ${item}`);
    process.exit(1);
  }

  console.log(`docs-check OK (${mdxFiles.length} arquivos .mdx, ${metaFiles.length} meta.json)`);
}

main();
