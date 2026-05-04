import { test, expect } from "@playwright/test";

test("source OS search filters module cards", async ({ page }) => {
  await page.route("**/api/source-apps/status", route =>
    route.fulfill({ json: [
      { id: "trimesh", name: "Trimesh", install_status: "not_installed" },
      { id: "blender", name: "Blender", install_status: "installed" },
    ]})
  );
  await page.goto("/#sources");
  await page.waitForSelector("#sourceOsSearch");
  await page.fill("#sourceOsSearch", "tri");
  // After filtering, trimesh should be visible
  await expect(page.locator(".source-module-card, button[data-source-index]").filter({ hasText: /trimesh/i })).toBeVisible();
});
