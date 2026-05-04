import { test, expect } from "@playwright/test";

test("dashboard fleet: click printer card opens Action Window", async ({ page }) => {
  await page.route("**/api/workspace", route =>
    route.fulfill({ json: { health: {}, settings: {}, printers: [{ id: "p1", name: "Ender 3", vendor: "Creality", connector: "moonraker", base_url: "http://printer1" }], jobs: [], artifacts: [], approvals: [], events: [], autopilot: {} } })
  );
  await page.goto("/#dashboard");
  await page.waitForSelector(".printer-card");
  await page.click(".printer-card");
  await expect(page.locator("#actionWindow")).toBeVisible();
});
