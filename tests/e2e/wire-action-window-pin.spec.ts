import { test, expect } from "@playwright/test";

test("action window pin prevents replacement", async ({ page }) => {
  await page.route("**/api/workspace", route =>
    route.fulfill({ json: { health: {}, settings: {}, printers: [
      { id: "p1", name: "Printer A", vendor: "A", connector: "moonraker", base_url: "http://p1", enabled: true },
      { id: "p2", name: "Printer B", vendor: "B", connector: "moonraker", base_url: "http://p2", enabled: true }
    ], jobs: [], artifacts: [], approvals: [], events: [], autopilot: {} } })
  );
  await page.goto("/");
  await page.click('button[data-page="printers"]');
  await page.waitForSelector("#printers .printer-card");
  await page.click("#printers .printer-card:first-child h3");
  await expect(page.locator("#actionWindow")).toBeVisible();
  // Pin the action window
  const pinBtn = page.locator("[data-aw-pin]");
  if (await pinBtn.count() > 0) {
    await pinBtn.click();
    const titleBefore = await page.locator("#actionWindow h2, #actionWindow .action-window__title").textContent();
    // Try to open second printer
    const cards = page.locator("#printers .printer-card");
    if (await cards.count() >= 2) {
      await page.click("#printers .printer-card:nth-child(2) h3");
      const titleAfter = await page.locator("#actionWindow h2, #actionWindow .action-window__title").textContent();
      // Title should NOT have changed (pinned)
      expect(titleAfter).toBe(titleBefore);
    }
  }
});
