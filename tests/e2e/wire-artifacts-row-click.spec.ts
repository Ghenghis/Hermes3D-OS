import { test, expect } from "@playwright/test";

test("artifacts row click opens Action Window", async ({ page }) => {
  await page.route("**/api/workspace", route =>
    route.fulfill({ json: { health: {}, settings: {}, printers: [], jobs: [],
      artifacts: [{ id: "a1", name: "model.gcode", path: "/output/model.gcode", size: 1024, kind: "gcode", job_id: "j1", job_title: "Test Job", is_visual: false, metadata: {} }],
      approvals: [], events: [], autopilot: {} } })
  );
  await page.goto("/");
  await page.click('button[data-page="artifacts"]');
  await page.waitForSelector(".artifact-card[data-artifact-id]");
  await page.click(".artifact-card[data-artifact-id]");
  await expect(page.locator("#actionWindow")).toBeVisible();
});
