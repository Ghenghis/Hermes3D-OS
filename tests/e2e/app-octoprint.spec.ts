import { test, expect } from "@playwright/test";

const octoprintStatus = (running = false) => ({
  source_root: "G:\\Github\\Hermes3D\\apps",
  supported_install_methods: ["pip"],
  note: "test status",
  apps: [
    {
      id: "octoprint",
      name: "OctoPrint",
      source_path: "G:\\Github\\Hermes3D\\apps\\print-farm\\OctoPrint",
      install_target: "G:\\Github\\Hermes3D\\apps\\print-farm\\OctoPrint",
      source_exists: true,
      source_has_git: false,
      cli_executable: "G:\\Github\\Hermes3D\\apps\\print-farm\\OctoPrint\\.venv\\Scripts\\octoprint.exe",
      installed_executable: "G:\\Github\\Hermes3D\\apps\\print-farm\\OctoPrint\\.venv\\Scripts\\octoprint.exe",
      install_method: "pip",
      install_status: "installed",
      install_state: { status: "installed", log_tail: ["pip install ok"], error: null },
      launch_supported: true,
      launch_kind: "",
      launch_status: running ? "running" : "stopped",
      launch_pid: running ? 5000 : null,
      launch_url: "http://127.0.0.1:5000",
      service_url: "http://127.0.0.1:5000",
      process_state: {
        ready: true,
        running,
        kind: "managed-process",
        url: "http://127.0.0.1:5000",
        pid: running ? 5000 : null,
        status: running ? "running" : "stopped",
      },
      embed_mode: "native-window-bridge-required",
      ui_host: "Hermes3D resizable Source OS workbench",
      safe_actions: ["inspect source", "run browser smoke after approval"],
    },
  ],
});

test.describe("OctoPrint app slot", () => {
  test("backend exposes OctoPrint pip venv metadata and process shape", async ({ request }) => {
    const statusRes = await request.get("/api/source-apps/status");
    expect(statusRes.ok()).toBeTruthy();
    const statusPayload = await statusRes.json();
    expect(statusPayload.supported_install_methods).toEqual(expect.arrayContaining(["pip"]));

    const octoprint = statusPayload.apps.find((app: { id: string }) => app.id === "octoprint");
    expect(octoprint).toMatchObject({
      id: "octoprint",
      install_method: "pip",
      launch_supported: true,
      service_url: "http://127.0.0.1:5000",
    });
    expect(octoprint.process_state.kind).toBe("managed-process");

    const stateRes = await request.get("/api/source-apps/octoprint/process-state");
    expect(stateRes.ok()).toBeTruthy();
    const statePayload = await stateRes.json();
    expect(statePayload.state.kind).toBe("managed-process");
    expect(statePayload.state.url).toBe("http://127.0.0.1:5000");
  });

  test("Source OS Action Window exposes OctoPrint install, launch, stop, and browser controls", async ({ page }) => {
    let running = false;
    await page.route("**/api/source-apps/status", async (route) => {
      await route.fulfill({ json: octoprintStatus(running) });
    });
    await page.route("**/api/source-apps/octoprint/install", async (route) => {
      await route.fulfill({
        json: {
          app_id: "octoprint",
          ok: true,
          status: "installed",
          method: "pip",
          state: octoprintStatus(false).apps[0].install_state,
        },
      });
    });
    await page.route("**/api/source-apps/octoprint/launch", async (route) => {
      running = true;
      await route.fulfill({
        json: {
          app_id: "octoprint",
          ok: true,
          state: octoprintStatus(true).apps[0].process_state,
          status: "running",
          url: "http://127.0.0.1:5000",
        },
      });
    });
    await page.route("**/api/source-apps/octoprint/stop", async (route) => {
      running = false;
      await route.fulfill({
        json: {
          app_id: "octoprint",
          ok: true,
          state: octoprintStatus(false).apps[0].process_state,
          status: "stopped",
        },
      });
    });

    await page.goto("/");
    await page.locator("#sourceGroupTabs [data-source-group='print_farm']").click();
    await page.locator("button.source-module-card").filter({ hasText: "OctoPrint" }).click();

    const actionWindow = page.locator("#actionWindow");
    await expect(actionWindow).toBeVisible();
    await expect(actionWindow).toHaveAttribute("data-item-id", "octoprint");
    await expect(actionWindow.locator(".action-window__title")).toHaveText("OctoPrint");
    await expect(actionWindow.locator("[data-panel-id='facts']")).toContainText("pip");
    await expect(actionWindow.locator("[data-panel-id='facts']")).toContainText("http://127.0.0.1:5000");
    await expect(actionWindow.getByRole("button", { name: "Install" })).toBeVisible();
    await expect(actionWindow.getByRole("button", { name: "Launch" })).toBeVisible();
    await expect(actionWindow.getByRole("button", { name: "Stop" })).toBeVisible();
    await expect(actionWindow.getByRole("button", { name: "Open Browser" })).toBeVisible();

    await actionWindow.getByRole("button", { name: "Launch" }).click();
    await expect(page.locator("#sourceDownloadState")).toContainText("OctoPrint: running at http://127.0.0.1:5000");

    await actionWindow.locator("[data-action-id='stop-app']").click();
    await expect(page.locator("#sourceDownloadState")).toContainText("OctoPrint: stopped");
  });
});
