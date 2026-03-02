import { test, expect } from "@playwright/test";

const runE2E = process.env.RUN_E2E_UI === "1";

test.describe("store checkout flow", () => {
  test.skip(!runE2E, "Set RUN_E2E_UI=1 to run UI e2e flows.");

  test("store -> open first product -> add to cart -> go checkout", async ({ page }) => {
    await page.goto("/store");
    await page.locator("[data-testid^='product-card-']").first().waitFor({ timeout: 15000 });
    await page.locator("[data-testid^='product-card-'] a").first().click();
    await expect(page).toHaveURL(/\/products\//);
    const addBtn = page.getByTestId("add-to-cart-button");
    await addBtn.click();
    await page.goto("/checkout");
    await expect(page.getByTestId("checkout-summary")).toBeVisible();
  });

  test("checkout -> create order shows checkout UI state", async ({ page }) => {
    await page.goto("/checkout");
    await expect(page.getByTestId("checkout-summary")).toBeVisible();
    await expect(page.getByTestId("checkout-continue-button")).toBeVisible();
  });
});

