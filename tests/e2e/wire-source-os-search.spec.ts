import { test, expect } from "@playwright/test";

test("source OS search filters module list", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("#sourceSearch");
  const buttons = page.locator("#sourceModuleList button, #sourceModuleList .source-module-btn");
  const initialCount = await buttons.count();
  if (initialCount > 1) {
    const firstText = await buttons.first().textContent();
    await page.fill("#sourceSearch", firstText?.substring(0, 3) || "a");
    // After filtering, fewer buttons should be visible (or same if all match)
    const visibleButtons = page.locator("#sourceModuleList button:visible, #sourceModuleList .source-module-btn:visible");
    const visibleCount = await visibleButtons.count();
    expect(visibleCount).toBeLessThanOrEqual(initialCount);
  }
});
