import { test, expect } from "@playwright/test";

test.describe("Hermes3D-OS shell smoke", () => {
  test("home page loads with title", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Hermes3D/i);
  });

  test("tab strip renders all 15 known tabs", async ({ page }) => {
    await page.goto("/");
    const tabs = page.locator("button.tab[data-page]");
    await expect(tabs).toHaveCount(15);
  });

  test("clicking tabs swaps active page", async ({ page }) => {
    await page.goto("/");
    await page.locator('button.tab[data-page="dashboard"]').click();
    await expect(page.locator("#page-dashboard")).toHaveClass(/active/);
    await page.locator('button.tab[data-page="settings"]').click();
    await expect(page.locator("#page-settings")).toHaveClass(/active/);
  });
});
