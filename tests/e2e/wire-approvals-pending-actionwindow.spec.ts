import { test, expect } from "@playwright/test";

test("approvals pending card click opens Action Window", async ({ page }) => {
  await page.route("**/api/workspace", route =>
    route.fulfill({ json: { health: {}, settings: {}, printers: [], jobs: [
      { id: "ap1", title: "Review this model", state: "MODEL_APPROVAL" }
    ],
      artifacts: [],
      approvals: [],
      events: [], autopilot: {} } })
  );
  await page.route("**/api/generation-stack/status", route => route.fulfill({ json: {} }));
  await page.route("**/api/learning-mode/status", route => route.fulfill({ json: {} }));
  await page.route("**/api/agentic-work/status", route => route.fulfill({ json: {} }));
  await page.route("**/api/providers/status", route => route.fulfill({ json: {} }));
  await page.goto("/");
  await page.click('button[data-page="approvals"]');
  await page.waitForSelector(".approval-card, [data-approval-id]");
  const card = page.locator(".approval-card, [data-approval-id]").first();
  await card.click();
  await expect(page.locator("#actionWindow")).toBeVisible();
});
