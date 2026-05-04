import { test, expect } from "@playwright/test";

test("observe tab: click camera tile opens Action Window", async ({ page }) => {
  await page.route("**/api/workspace", route =>
    route.fulfill({ json: { health: {}, settings: {}, printers: [{ id: "p1", name: "Ender 3", connector: "moonraker", base_url: "http://printer1", capabilities: {} }], jobs: [], artifacts: [], approvals: [], events: [], autopilot: {} } })
  );
  await page.goto("/#observe");
  await page.waitForSelector(".camera-card");
  await page.click(".camera-card");
  await expect(page.locator("#actionWindow")).toBeVisible();
  await expect(page.locator("#actionWindow")).toContainText("Ender 3");
});
