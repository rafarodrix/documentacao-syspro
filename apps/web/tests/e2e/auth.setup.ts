import { expect, test } from "@playwright/test";

const email = process.env.E2E_USER_EMAIL;
const password = process.env.E2E_USER_PASSWORD;

test("authenticate portal user", async ({ page }) => {
  test.skip(!email || !password, "E2E_USER_EMAIL/E2E_USER_PASSWORD nao configurados.");

  await page.goto("/login?callbackUrl=%2Fportal");

  const emailInput = page.locator("#email");
  const passwordInput = page.locator("#password");
  const submitButton = page.getByRole("button", { name: "Entrar no Sistema" });
  const loginError = page.getByRole("alert").filter({ hasText: "Falha no login" });

  await expect(emailInput).toBeVisible();
  await expect(passwordInput).toBeVisible();
  await expect(submitButton).toBeEnabled();

  await emailInput.fill(email!);
  await passwordInput.fill(password!);
  await expect(emailInput).toHaveValue(email!);
  await expect(passwordInput).toHaveValue(password!);

  await submitButton.click();

  const outcome = await Promise.race([
    page.waitForURL(/\/portal(\/|\?|$)/, { timeout: 15000 }).then(() => "portal" as const),
    loginError.waitFor({ state: "visible", timeout: 15000 }).then(() => "error" as const),
  ]);

  if (outcome === "error") {
    const errorText = (await loginError.textContent())?.trim() || "Falha de login sem mensagem visivel.";
    throw new Error(`Falha no login E2E: ${errorText}`);
  }

  await page.context().storageState({ path: "tests/e2e/.auth/user.json" });
  await expect(page).toHaveURL(/\/portal(\/|\?|$)/);
});
