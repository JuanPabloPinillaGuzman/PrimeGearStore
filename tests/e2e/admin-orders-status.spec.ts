import { test, expect } from "@playwright/test";

const runE2E = process.env.RUN_E2E_UI === "1" && process.env.E2E_ADMIN_EMAIL && process.env.E2E_ADMIN_PASSWORD;

test.describe("admin orders status", () => {
  test.skip(!runE2E, "Set RUN_E2E_UI=1 and E2E_ADMIN_EMAIL/E2E_ADMIN_PASSWORD to run admin e2e.");

  test("admin login -> orders -> change status PACKING (if available)", async ({ page }) => {
    await page.goto("/auth/signin");
    await page.getByLabel(/email/i).fill(process.env.E2E_ADMIN_EMAIL!);
    await page.getByLabel(/password/i).fill(process.env.E2E_ADMIN_PASSWORD!);
    await page.getByRole("button", { name: /sign in|iniciar/i }).click();

    await page.goto("/admin/orders");
    const packButton = page.locator("[data-testid^='admin-order-pack-']").first();
    const count = await packButton.count();
    test.skip(count === 0, "No order in PAID state available for PACKING transition.");
    await packButton.click();
    await expect(page.getByTestId("admin-orders-message")).toBeVisible();
  });
});
