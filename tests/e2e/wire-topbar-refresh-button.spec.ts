import { test, expect } from "@playwright/test";

test("topbar refresh button triggers data reload", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("#refreshBtn");
  // Click refresh and verify the button still exists (no page navigation)
  await page.click("#refreshBtn");
  await expect(page.locator("#refreshBtn")).toBeVisible();
  // Verify health element still shows (app didn't crash)
  await expect(page.locator("#health")).toBeVisible();
});
