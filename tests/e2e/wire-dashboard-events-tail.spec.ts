import { test, expect } from "@playwright/test";

test("dashboard events: click event card opens Action Window", async ({ page }) => {
  await page.route("**/api/workspace", route =>
    route.fulfill({ json: { health: {}, settings: {}, printers: [], jobs: [], artifacts: [], approvals: [], events: [{ event_type: "print_started", message: "Benchy started", created_at: "2026-05-03" }], autopilot: {} } })
  );
  await page.goto("/#dashboard");
  await page.waitForSelector(".event-card");
  await page.click(".event-card");
  await expect(page.locator("#actionWindow")).toBeVisible();
});
