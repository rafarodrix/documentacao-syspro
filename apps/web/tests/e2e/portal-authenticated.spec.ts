import { expect, test } from "@playwright/test";

const hasAuthEnv = Boolean(process.env.E2E_USER_EMAIL && process.env.E2E_USER_PASSWORD);

test.describe("authenticated portal shell", () => {
  test.beforeEach(() => {
    test.skip(!hasAuthEnv, "Fluxo autenticado exige credenciais E2E_USER_EMAIL/E2E_USER_PASSWORD.");
  });

  test("authenticated user can open portal shell", async ({ page }) => {
    test.setTimeout(60000);

    await page.goto("/portal", { waitUntil: "domcontentloaded", timeout: 45000 });
    await expect(page).toHaveURL(/\/portal(\/|\?|$)/);
    await expect(page.getByRole("link", { name: /Dashboard/i })).toBeVisible({ timeout: 45000 });
    await expect(page.getByRole("link", { name: /Tickets/i })).toBeVisible({ timeout: 45000 });
    await expect(page.getByRole("button", { name: /^R$/i })).toBeVisible({ timeout: 45000 });
  });
});
