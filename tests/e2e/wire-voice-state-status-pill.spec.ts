import { test, expect } from "@playwright/test";

test("voice status pill click opens Action Window", async ({ page }) => {
  await page.route("**/api/voice/state", route =>
    route.fulfill({ json: { status: "idle", muted: false } })
  );
  await page.goto("/");
  await page.waitForSelector("#voiceStatusPill");
  await page.click("#voiceStatusPill");
  await expect(page.locator("#actionWindow")).toBeVisible();
});
