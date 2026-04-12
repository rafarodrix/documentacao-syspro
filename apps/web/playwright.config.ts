import { defineConfig, devices } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

function loadEnvFile(filePath: string, override = false) {
  if (!fs.existsSync(filePath)) return;

  const content = fs.readFileSync(filePath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex <= 0) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    const value = rawValue.replace(/^['"]|['"]$/g, "");

    if (override || !(key in process.env)) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(path.join(__dirname, ".env"));
loadEnvFile(path.join(__dirname, ".env.local"));
loadEnvFile(path.join(__dirname, ".env.e2e"), true);

const PORT = Number(process.env.E2E_PORT ?? 3100);
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${PORT}`;
const hasAuthEnv = Boolean(process.env.E2E_USER_EMAIL && process.env.E2E_USER_PASSWORD);

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["html", { open: "never" }], ["list"]] : "list",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: {
    command: `npm run dev -w @dosc-syspro/web -- --hostname 127.0.0.1 --port ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    stdout: "pipe",
    stderr: "pipe",
    timeout: 120_000,
  },
  projects: [
    {
      name: "setup-auth",
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: "public-chromium",
      testMatch: [/public-docs\.spec\.ts/, /portal-redirect\.spec\.ts/],
      use: {
        ...devices["Desktop Chrome"],
      },
    },
    {
      name: "authenticated-chromium",
      testMatch: /portal-authenticated\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        storageState: hasAuthEnv ? "tests/e2e/.auth/user.json" : undefined,
      },
      dependencies: hasAuthEnv ? ["setup-auth"] : [],
    },
  ],
});
