import { expect, test, type Locator, type Page } from "@playwright/test";

const email = process.env.E2E_USER_EMAIL;
const password = process.env.E2E_USER_PASSWORD;

async function fillControlledInput(page: Page, locator: Locator, value: string) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await locator.click();
    await locator.fill("");
    await locator.fill(value);

    try {
      await expect(locator).toHaveValue(value, { timeout: 2000 });
      return;
    } catch {
      await page.waitForTimeout(500);
    }
  }

  throw new Error(`Nao foi possivel manter o valor no campo ${await locator.getAttribute("id")}.`);
}

test("authenticate portal user", async ({ page }) => {
  test.skip(!email || !password, "E2E_USER_EMAIL/E2E_USER_PASSWORD nao configurados.");

  await page.goto("/login?callbackUrl=%2Fportal");
  await page.waitForURL(/\/login(\?|$)/, { timeout: 15000 });
  await page.waitForLoadState("networkidle");

  const emailInput = page.locator("#email");
  const passwordInput = page.locator("#password");
  const submitButton = page.getByRole("button", { name: "Entrar no Sistema" });
  const loginError = page.getByRole("alert").filter({ hasText: "Falha no login" });

  await expect(emailInput).toBeVisible();
  await expect(passwordInput).toBeVisible();
  await expect(submitButton).toBeEnabled();

  await fillControlledInput(page, emailInput, email!);
  await fillControlledInput(page, passwordInput, password!);

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
