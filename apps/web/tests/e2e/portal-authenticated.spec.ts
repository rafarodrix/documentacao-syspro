import { expect, test } from "@playwright/test";

const hasAuthEnv = Boolean(process.env.E2E_USER_EMAIL && process.env.E2E_USER_PASSWORD);

test.describe("authenticated portal shell", () => {
  test.beforeEach(() => {
    test.skip(!hasAuthEnv, "Fluxo autenticado exige credenciais E2E_USER_EMAIL/E2E_USER_PASSWORD.");
  });

  test("authenticated user can open portal shell", async ({ page }) => {
    await page.goto("/portal");
    await expect(page).toHaveURL(/\/portal(\/|\?|$)/);
    await expect(page.getByText(/Bom dia,/i)).toBeVisible();
    await expect(page.getByRole("link", { name: /Documentacao/i })).toBeVisible();
  });
});
