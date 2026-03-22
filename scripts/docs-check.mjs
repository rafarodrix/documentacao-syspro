import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve, relative } from "node:path";

const ROOT = resolve(process.cwd(), "content", "docs");
const MDX_EXTENSION = ".mdx";
const SEPARATOR_RE = /^---.*---$/;
const NON_ASCII_OR_SPACE_RE = /[^\x00-\x7F]|\s/;

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
  checkFileNaming(allFiles);

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
