import { expect, test } from "@playwright/test";

test("public smoke: store route responds", async ({ request }) => {
  const response = await request.get("/store");
  expect(response.status()).toBe(200);
  const html = await response.text();
  expect(html).toContain("PrimeGearStore");
});
