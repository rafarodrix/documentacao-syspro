import { expect, test } from "@playwright/test";

test.describe("protected portal redirects", () => {
  test("/portal redirects unauthenticated users to login preserving callback", async ({ page }) => {
    await page.goto("/portal");
    await page.waitForURL(/\/login\?callbackUrl=%2Fportal/);

    await expect(page.getByRole("heading", { name: /Acesso ao Portal/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Entrar no Sistema/i })).toBeVisible();
  });
});
