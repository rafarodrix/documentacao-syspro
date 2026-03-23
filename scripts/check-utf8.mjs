import { readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join, resolve } from "node:path";

const root = process.cwd();
const textExtensions = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".mjs",
  ".cjs",
  ".json",
  ".md",
  ".mdx",
  ".css",
  ".scss",
  ".html",
  ".yml",
  ".yaml",
]);

const ignoredDirs = new Set([".git", ".next", "node_modules", "coverage", "dist", "build"]);
const suspiciousPatterns = [/Ã./, /â€./, /âœ./, /�/];
const violations = [];

function walk(dir) {
  if (!statSafe(dir)?.isDirectory()) return;
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (ignoredDirs.has(entry.name)) continue;
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
      continue;
    }
    if (!textExtensions.has(extname(entry.name))) continue;
    inspect(fullPath);
  }
}

function statSafe(path) {
  try {
    return statSync(path);
  } catch {
    return null;
  }
}

function inspect(filePath) {
  const buffer = readFileSync(filePath);

  if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    violations.push({ filePath, issue: "UTF-8 com BOM" });
  }

  const content = buffer.toString("utf8");
  if (content.includes("\u0000")) {
    violations.push({ filePath, issue: "Conteudo invalido para texto UTF-8" });
    return;
  }

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(content)) {
      violations.push({ filePath, issue: `Possivel mojibake: ${pattern}` });
      break;
    }
  }
}

walk(resolve(root, "apps"));
walk(resolve(root, "packages"));

for (const fileName of ["package.json", "vercel.json", "turbo.json", "tsconfig.base.json"]) {
  const filePath = resolve(root, fileName);
  if (statSafe(filePath)?.isFile()) inspect(filePath);
}

if (violations.length > 0) {
  console.error("UTF-8 check failed:");
  for (const violation of violations) {
    console.error(`- ${violation.filePath}: ${violation.issue}`);
  }
  process.exit(1);
}

console.log("UTF-8 check passed.");
