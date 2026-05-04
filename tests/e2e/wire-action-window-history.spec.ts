import { test, expect } from "@playwright/test";

test("action window: back/forward navigation through history", async ({ page }) => {
  await page.route("**/api/workspace", route =>
    route.fulfill({ json: { health: {}, settings: {}, printers: [], jobs: [], artifacts: [], approvals: [], events: [], autopilot: {} } })
  );
  await page.goto("/");
  await page.waitForFunction(() => typeof window.HermesActionWindow !== "undefined");

  // Dispatch 3 payloads
  await page.evaluate(() => {
    window.HermesActionWindow.dispatch({ tab_id: "t", kind: "job", item_id: "1", title: "First", subtitle: "", status_pill: "ok", primary_actions: [], secondary_actions: [], panels: [], stream_url: null });
    window.HermesActionWindow.dispatch({ tab_id: "t", kind: "job", item_id: "2", title: "Second", subtitle: "", status_pill: "ok", primary_actions: [], secondary_actions: [], panels: [], stream_url: null });
    window.HermesActionWindow.dispatch({ tab_id: "t", kind: "job", item_id: "3", title: "Third", subtitle: "", status_pill: "ok", primary_actions: [], secondary_actions: [], panels: [], stream_url: null });
  });
  await expect(page.locator("#actionWindow")).toContainText("Third");
  await page.click("#actionWindowBack");
  await expect(page.locator("#actionWindow")).toContainText("Second");
  await page.click("#actionWindowBack");
  await expect(page.locator("#actionWindow")).toContainText("First");
  await page.click("#actionWindowForward");
  await expect(page.locator("#actionWindow")).toContainText("Second");
});
