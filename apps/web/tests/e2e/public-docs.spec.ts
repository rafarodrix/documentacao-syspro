import { expect, test } from "@playwright/test";

test.describe("public landing and docs", () => {
  test("landing page renders hero and main entrypoints", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: /Central/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Acessar Portal do Cliente/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Explorar Documentação/i })).toBeVisible();
  });

  test("protected docs redirect unauthenticated users to login with callback", async ({ page }) => {
    await page.goto("/docs");
    await page.waitForURL(/\/login\?callbackUrl=%2Fdocs/);
    await expect(page.getByRole("heading", { name: /Acesso ao Portal/i })).toBeVisible();
  });
});
