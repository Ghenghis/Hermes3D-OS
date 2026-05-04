import { test, expect } from "@playwright/test";

test("jobs row click opens Action Window", async ({ page }) => {
  await page.route("**/api/workspace", route =>
    route.fulfill({ json: { health: {}, settings: {}, printers: [], jobs: [
      { id: 1, name: "My Print Job", status: "queued" }
    ], artifacts: [], approvals: [], events: [], autopilot: {} } })
  );
  await page.goto("/");
  await page.click('button[data-page="jobs"]');
  await page.waitForSelector("#page-jobs .job-card");
  await page.click("#page-jobs .job-card");
  await expect(page.locator("#actionWindow")).toBeVisible();
});
