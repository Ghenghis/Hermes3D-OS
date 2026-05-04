import { test, expect } from "@playwright/test";

const blenderStatus = (installStatus: string) => ({
  source_root: "G:\\Github\\Hermes3D\\apps",
  supported_install_methods: ["clone-shallow", "clone-full", "noop", "pip"],
  note: "test status",
  apps: [
    {
      id: "blender",
      name: "Blender",
      source_path: "G:\\Github\\Hermes3D\\apps\\modelers\\Blender",
      source_exists: installStatus === "installed",
      source_has_git: installStatus === "installed",
      cli_executable: "C:\\Program Files\\Blender Foundation\\Blender 4.4\\blender.exe",
      installed_executable: "C:\\Program Files\\Blender Foundation\\Blender 4.4\\blender.exe",
      install_method: "clone-shallow",
      install_status: installStatus,
      install_state: { status: installStatus, log_tail: [], error: null },
      launch_supported: true,
      launch_kind: "cli-smoke",
      embed_mode: "native-window-bridge-required",
      ui_host: "Hermes3D resizable Source OS workbench",
      safe_actions: ["inspect source", "run CLI dry-run after approval"],
    },
  ],
});

test.describe("Blender CLI app slot", () => {
  test("status includes Blender clone install metadata", async ({ request }) => {
    const res = await request.get("/api/source-apps/status");
    expect(res.ok()).toBeTruthy();
    const payload = await res.json();
    const blender = payload.apps.find((app: { id: string }) => app.id === "blender");
    expect(blender).toMatchObject({
      id: "blender",
      install_method: "clone-shallow",
      launch_supported: true,
      launch_kind: "cli-smoke",
    });
    expect(payload.source_root).toContain("Hermes3D");
  });

  test("unknown launch request returns ok=false", async ({ request }) => {
    const res = await request.post("/api/source-apps/not-blender/launch");
    expect(res.ok()).toBeTruthy();
    const payload = await res.json();
    expect(payload.ok).toBe(false);
    expect(payload.error).toContain("unknown app id");
  });

  test("Action Window installs and launches Blender CLI path", async ({ page }) => {
    let status = "not_installed";
    await page.route("**/api/source-apps/status", async (route) => {
      await route.fulfill({ json: blenderStatus(status) });
    });
    await page.route("**/api/source-apps/blender/install", async (route) => {
      status = "installed";
      await route.fulfill({
        json: {
          app_id: "blender",
          ok: true,
          status: "installing",
          method: "clone-shallow",
          state: { status: "installed", log_tail: ["blender smoke ok"], error: null },
        },
      });
    });
    await page.route("**/api/source-apps/blender/launch", async (route) => {
      await route.fulfill({
        json: {
          app_id: "blender",
          ok: true,
          launch_status: "ok",
          stdout: "Blender 4.4.0",
          returncode: 0,
        },
      });
    });

    await page.goto("/");
    await page.locator("#sourceGroupTabs").getByRole("button", { name: "Modelers" }).click();
    await page.locator("button.source-module-card").filter({ hasText: "Blender" }).click();

    const actionWindow = page.locator("#actionWindow");
    await expect(actionWindow).toBeVisible();
    await expect(actionWindow).toContainText("clone-shallow");
    await expect(actionWindow.getByRole("button", { name: "Install" })).toBeVisible();
    await expect(actionWindow.getByRole("button", { name: "Launch" })).toBeVisible();

    await actionWindow.getByRole("button", { name: "Install" }).click();
    await expect(page.locator("#sourceDownloadState")).toContainText(/install (installing|installed)/);
    await expect(actionWindow).toContainText("installed");

    await actionWindow.getByRole("button", { name: "Launch" }).click();
    await expect(page.locator("#sourceDownloadState")).toContainText("launch ok");
  });
});
