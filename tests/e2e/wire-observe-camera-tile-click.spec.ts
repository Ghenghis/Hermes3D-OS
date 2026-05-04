import { test, expect } from "@playwright/test";

test("observe camera tile click opens Action Window", async ({ page }) => {
  await page.route("**/api/workspace", route =>
    route.fulfill({ json: { health: {}, settings: {}, printers: [
      { id: "p1", name: "Ender 3", vendor: "Creality", connector: "moonraker", base_url: "http://printer1", enabled: true }
    ], jobs: [], artifacts: [], approvals: [], events: [], autopilot: {} } })
  );
  await page.goto("/");
  await page.click('button[data-page="observe"]');
  await page.waitForSelector(".camera-card");
  await page.click(".camera-card");
  await expect(page.locator("#actionWindow")).toBeVisible();
});
