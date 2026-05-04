import { test, expect } from "@playwright/test";

test("debug logger fires on actionwindow:render when ?debug=1", async ({ page }) => {
  const logs: string[] = [];
  page.on("console", msg => { if (msg.text().includes("[ActionWindow]") || msg.text().includes("[Hermes3D]")) logs.push(msg.text()); });

  await page.route("**/api/workspace", route =>
    route.fulfill({ json: { health: {}, settings: {}, printers: [
      { id: "p1", name: "Debug Printer", vendor: "Test", connector: "moonraker", base_url: "http://p1", enabled: true }
    ], jobs: [], artifacts: [], approvals: [], events: [], autopilot: {} } })
  );
  await page.goto("/?debug=1");
  await page.click('button[data-page="printers"]');
  await page.waitForSelector("#printers .printer-card");
  await page.click("#printers .printer-card h3");
  await expect(page.locator("#actionWindow")).toBeVisible();
  // Should have logged at least one [ActionWindow] message
  expect(logs.length).toBeGreaterThan(0);
});