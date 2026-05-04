import { test, expect } from "@playwright/test";

test("agents list row click opens Action Window", async ({ page }) => {
  await page.route("**/api/workspace", route =>
    route.fulfill({ json: { health: {}, settings: {}, printers: [], jobs: [], artifacts: [], approvals: [], events: [], autopilot: {} } })
  );
  await page.route("**/api/agents/list", route =>
    route.fulfill({ json: [{ id: "claude-1", name: "Claude Agent", status: "active", role: "orchestrator" }] })
  );
  await page.goto("/");
  await page.click('button[data-page="agents"]');
  await page.waitForSelector(".agent-card");
  await page.click(".agent-card");
  await expect(page.locator("#actionWindow")).toBeVisible();
});
