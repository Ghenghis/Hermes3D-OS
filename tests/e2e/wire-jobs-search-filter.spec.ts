import { test, expect } from "@playwright/test";

test("jobs search filter narrows job list", async ({ page }) => {
  await page.route("**/api/workspace", route =>
    route.fulfill({ json: { health: {}, settings: {}, printers: [], jobs: [
      { id: 1, name: "alpha job", title: "alpha job", status: "queued", state: "queued" },
      { id: 2, name: "beta job", title: "beta job", status: "done", state: "done" }
    ], artifacts: [], approvals: [], events: [], autopilot: {} } })
  );
  await page.goto("/#jobs");
  await page.click('button[data-page="jobs"]');
  await page.waitForSelector("#jobsSearchInput");
  await page.fill("#jobsSearchInput", "alpha");
  await expect(page.locator(".job-card")).toHaveCount(1);
});
