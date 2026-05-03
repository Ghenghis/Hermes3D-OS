import { test, expect } from "@playwright/test";

test.describe("PrusaSlicer app install", () => {
  test.setTimeout(240_000);

  test("installs PrusaSlicer and launches the installed binary", async ({ page, request }) => {
    await page.goto("/");

    const prusaCard = page.locator("button.source-module-card").filter({ hasText: "PrusaSlicer" }).first();
    await prusaCard.waitFor({ state: "visible", timeout: 10_000 });
    await prusaCard.click();

    const actionWindow = page.locator("#actionWindow");
    await expect(actionWindow).toBeVisible();
    await expect(actionWindow.locator(".action-window__title")).toHaveText("PrusaSlicer");
    await expect(actionWindow.getByRole("button", { name: "Install" })).toBeVisible();
    await expect(actionWindow.getByRole("button", { name: "Launch" })).toBeVisible();
    await expect(actionWindow.getByRole("button", { name: "Open Repo" })).toBeVisible();

    await actionWindow.getByRole("button", { name: "Install" }).click();
    await expect(actionWindow.locator(".action-window__pill")).toHaveText("installed", { timeout: 180_000 });

    await actionWindow.getByRole("button", { name: "Launch" }).click();
    await expect(page.locator("#sourceDownloadState")).toContainText(/launch running pid \d+/, { timeout: 30_000 });

    const statusRes = await request.get("/api/source-apps/status");
    expect(statusRes.ok()).toBeTruthy();
    const statusPayload = await statusRes.json();
    const appStatus = statusPayload.apps.find((app: { id: string }) => app.id === "prusaslicer");
    expect(appStatus.install_status).toBe("installed");
    expect(appStatus.launch_status).toBe("running");
    expect(appStatus.installed_executable).toMatch(/prusa-slicer/i);
  });
});
