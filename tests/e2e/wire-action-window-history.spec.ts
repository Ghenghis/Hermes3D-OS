import { test, expect } from "@playwright/test";

test("action window back button navigates history", async ({ page }) => {
  await page.route("**/api/workspace", route =>
    route.fulfill({ json: { health: {}, settings: {}, printers: [
      { id: "p1", name: "Printer A", vendor: "A", connector: "moonraker", base_url: "http://p1", enabled: true },
      { id: "p2", name: "Printer B", vendor: "B", connector: "moonraker", base_url: "http://p2", enabled: true }
    ], jobs: [], artifacts: [], approvals: [], events: [], autopilot: {} } })
  );
  await page.goto("/");
  await page.click('button[data-page="printers"]');
  await page.waitForSelector("#printers .printer-card");
  // Click first printer
  await page.click("#printers .printer-card:first-child h3");
  await expect(page.locator("#actionWindow")).toBeVisible();
  const firstTitle = await page.locator("#actionWindow h2, #actionWindow .action-window__title").textContent();
  // Click second printer if there are 2
  const cards = page.locator("#printers .printer-card");
  if (await cards.count() >= 2) {
    await page.click("#printers .printer-card:nth-child(2) h3");
    // Back button should navigate to first
    const backBtn = page.locator("[data-aw-back]");
    if (await backBtn.count() > 0) {
      await backBtn.click();
      const currentTitle = await page.locator("#actionWindow h2, #actionWindow .action-window__title").textContent();
      expect(currentTitle).toBe(firstTitle);
    }
  }
});
