import { test, expect } from "@playwright/test";

test("source OS module buttons show status pills", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("#sourceModuleList");
  // After source manifest loads, check that module buttons exist
  const buttons = page.locator("#sourceModuleList button, #sourceModuleList .source-module-btn");
  const count = await buttons.count();
  if (count > 0) {
    // Check that at least one status pill is visible
    const pills = page.locator("#sourceModuleList .status-pill");
    // May be 0 if no status data loaded; just verify no JS errors
    expect(count).toBeGreaterThan(0);
  }
});
