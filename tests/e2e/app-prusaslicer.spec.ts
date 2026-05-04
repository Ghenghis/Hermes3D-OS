import { test, expect } from "@playwright/test";

const prusaStatus = (installStatus: string) => ({
  source_root: "G:\\Github\\Hermes3D\\apps",
  supported_install_methods: ["binary-download", "clone-full", "clone-full-venv", "clone-shallow", "noop", "pip"],
  note: "test status",
  apps: [
    {
      id: "prusaslicer",
      name: "PrusaSlicer",
      source_path: "G:\\Github\\Hermes3D\\apps\\slicers\\PrusaSlicer",
      install_target: "G:\\Github\\Hermes3D\\apps\\slicers\\PrusaSlicer",
      source_exists: installStatus === "installed",
      source_has_git: false,
      cli_executable: installStatus === "installed" ? "G:\\Github\\Hermes3D\\apps\\slicers\\PrusaSlicer\\prusa-slicer-console.exe" : "",
      installed_executable: installStatus === "installed" ? "G:\\Github\\Hermes3D\\apps\\slicers\\PrusaSlicer\\prusa-slicer.exe" : "",
      install_method: "binary-download",
      install_status: installStatus,
      install_state: { status: installStatus, log_tail: [], error: null },
      launch_supported: true,
      launch_status: "stopped",
      launch_pid: null,
      embed_mode: "native-window-bridge-required",
      ui_host: "Hermes3D resizable Source OS workbench",
      safe_actions: ["inspect source", "run CLI dry-run after approval"],
    },
  ],
});

test.describe("PrusaSlicer app install", () => {
  test("backend exposes PrusaSlicer binary-download metadata", async ({ request }) => {
    const res = await request.get("/api/source-apps/status");
    expect(res.ok()).toBeTruthy();
    const payload = await res.json();
    expect(payload.supported_install_methods).toEqual(expect.arrayContaining(["binary-download"]));

    const prusa = payload.apps.find((app: { id: string }) => app.id === "prusaslicer");
    expect(prusa).toMatchObject({
      id: "prusaslicer",
      install_method: "binary-download",
      launch_supported: true,
    });
  });

  test("unknown launch request returns ok=false", async ({ request }) => {
    const res = await request.post("/api/source-apps/not-prusa/launch");
    expect(res.ok()).toBeTruthy();
    const payload = await res.json();
    expect(payload.ok).toBe(false);
    expect(payload.error).toContain("unknown app id");
  });

  test("Action Window installs and launches PrusaSlicer path", async ({ page }) => {
    let status = "not_installed";
    await page.route("**/api/source-apps/status", async (route) => {
      await route.fulfill({ json: prusaStatus(status) });
    });
    await page.route("**/api/source-apps/prusaslicer/install", async (route) => {
      status = "installed";
      await route.fulfill({
        json: {
          app_id: "prusaslicer",
          ok: true,
          status: "installing",
          method: "binary-download",
          state: { status: "installed", log_tail: ["binary download ok"], error: null },
        },
      });
    });
    await page.route("**/api/source-apps/prusaslicer/launch", async (route) => {
      await route.fulfill({
        json: {
          app_id: "prusaslicer",
          ok: true,
          status: "running",
          pid: 4242,
          executable: "G:\\Github\\Hermes3D\\apps\\slicers\\PrusaSlicer\\prusa-slicer.exe",
        },
      });
    });

    await page.goto("/");
    await page.locator("button.source-module-card").filter({ hasText: "PrusaSlicer" }).click();

    const actionWindow = page.locator("#actionWindow");
    await expect(actionWindow).toBeVisible();
    await expect(actionWindow.locator(".action-window__title")).toHaveText("PrusaSlicer");
    await expect(actionWindow.getByRole("button", { name: "Install" })).toBeVisible();
    await expect(actionWindow.getByRole("button", { name: "Launch" })).toBeVisible();
    await expect(actionWindow.getByRole("button", { name: "Open Repo" })).toBeVisible();

    await actionWindow.getByRole("button", { name: "Install" }).click();
    await expect(actionWindow.locator(".action-window__pill")).toHaveText("installed", { timeout: 5_000 });

    await actionWindow.getByRole("button", { name: "Launch" }).click();
    await expect(page.locator("#sourceDownloadState")).toContainText("launch running pid 4242");
  });
});
