import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const rootDir = process.cwd();
const appNextDir = resolve(rootDir, "apps/web/.next");
const rootNextDir = resolve(rootDir, ".next");

if (!existsSync(appNextDir)) {
  console.error(`[sync-next-output] Build output not found: ${appNextDir}`);
  process.exit(1);
}

rmSync(rootNextDir, { recursive: true, force: true });
mkdirSync(rootNextDir, { recursive: true });
cpSync(appNextDir, rootNextDir, { recursive: true });

console.log(`[sync-next-output] Synced ${appNextDir} -> ${rootNextDir}`);
