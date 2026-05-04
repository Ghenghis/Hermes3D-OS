import { test, expect } from "@playwright/test";

test("printers tab: click printer row opens Action Window with kind=printer", async ({ page }) => {
  await page.route("**/api/workspace", route =>
    route.fulfill({ json: { health: {}, settings: {}, printers: [{ id: "p1", name: "Ender 3", vendor: "Creality", model: "Ender 3 Pro", connector: "moonraker", base_url: "http://printer1" }], jobs: [], artifacts: [], approvals: [], events: [], autopilot: {} } })
  );
  await page.goto("/#printers");
  await page.waitForSelector(".printer-card");
  await page.click(".printer-card h3");
  await expect(page.locator("#actionWindow")).toBeVisible();
  await expect(page.locator("#actionWindow")).toContainText("Ender 3");
});
