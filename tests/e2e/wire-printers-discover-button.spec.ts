import { test, expect } from "@playwright/test";

test("printers: discover button POSTs and shows toast", async ({ page }) => {
  await page.route("**/api/workspace", route =>
    route.fulfill({ json: { health: {}, settings: {}, printers: [], jobs: [], artifacts: [], approvals: [], events: [], autopilot: {} } })
  );
  let discoverCalled = false;
  await page.route("**/api/printers/discover", route => {
    discoverCalled = true;
    route.fulfill({ json: { discovered: 2 } });
  });
  await page.goto("/#printers");
  await page.click("#printersDiscover");
  await expect(page.locator("#hermes-toast")).toBeVisible();
  expect(discoverCalled).toBe(true);
});
