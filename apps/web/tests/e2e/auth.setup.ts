import { expect, test } from "@playwright/test";

const email = process.env.E2E_USER_EMAIL;
const password = process.env.E2E_USER_PASSWORD;

test("authenticate portal user", async ({ page }) => {
  test.skip(!email || !password, "E2E_USER_EMAIL/E2E_USER_PASSWORD nao configurados.");

  await page.goto("/login?callbackUrl=%2Fportal");
  await page.getByLabel("E-mail Corporativo").fill(email!);
  await page.locator("#password").fill(password!);

  const loginError = page.getByRole("alert").filter({ hasText: "Falha no login" });

  await page.getByRole("button", { name: "Entrar no Sistema" }).click();

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
