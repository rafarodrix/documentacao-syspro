import { expect, test } from "@playwright/test";

const email = process.env.E2E_USER_EMAIL;
const password = process.env.E2E_USER_PASSWORD;

test("authenticate portal user", async ({ page }) => {
  test.skip(!email || !password, "E2E_USER_EMAIL/E2E_USER_PASSWORD nao configurados.");

  await page.goto("/login");
  await page.getByLabel("E-mail Corporativo").fill(email!);
  await page.getByLabel("Senha").fill(password!);
  await page.getByRole("button", { name: "Entrar no Sistema" }).click();
  await page.waitForURL(/\/portal(\/|\?|$)/);
  await page.context().storageState({ path: "tests/e2e/.auth/user.json" });
  await expect(page).toHaveURL(/\/portal(\/|\?|$)/);
});
