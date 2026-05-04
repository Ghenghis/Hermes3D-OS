import { test, expect } from "@playwright/test";

const fluiddStatus = (installStatus = "installed") => ({
  source_root: "G:\\Github\\Hermes3D\\apps",
  supported_install_methods: ["clone-full", "npm-build"],
  note: "test status",
  apps: [
    {
      id: "fluidd",
      name: "Fluidd",
      source_path: "G:\\Github\\Hermes3D\\apps\\print-farm\\Fluidd",
      source_exists: true,
      source_has_git: true,
      cli_executable: "",
      installed_executable: "",
      install_method: "npm-build",
      install_status: installStatus,
      install_state: {
        status: installStatus,
        log_tail: installStatus === "installed" ? ["npm build ok"] : [],
        error: null,
      },
      launch_supported: true,
      launch_kind: "",
      launch_status: "running",
      launch_pid: null,
      launch_url: "/static/fluidd/",
      process_state: {
        ready: true,
        running: true,
        kind: "static-serve",
        url: "/static/fluidd/",
        pid: null,
      },
      embed_mode: "native-window-bridge-required",
      ui_host: "Hermes3D resizable Source OS workbench",
      safe_actions: ["inspect source", "run browser smoke after approval"],
    },
  ],
});

test.describe("Fluidd app slot", () => {
  test("backend exposes Fluidd npm-build metadata and static process shape", async ({ request }) => {
    const statusRes = await request.get("/api/source-apps/status");
    expect(statusRes.ok()).toBeTruthy();
    const statusPayload = await statusRes.json();
    expect(statusPayload.supported_install_methods).toEqual(expect.arrayContaining(["npm-build"]));

    const fluidd = statusPayload.apps.find((app: { id: string }) => app.id === "fluidd");
    expect(fluidd).toMatchObject({
      id: "fluidd",
      install_method: "npm-build",
      launch_supported: true,
      launch_url: "/static/fluidd/",
    });

    const stateRes = await request.get("/api/source-apps/fluidd/process-state");
    expect(stateRes.ok()).toBeTruthy();
    const statePayload = await stateRes.json();
    expect(statePayload.state.kind).toBe("static-serve");
    expect(statePayload.state.url).toBe("/static/fluidd/");
  });

  test("Source OS Action Window exposes Fluidd install and launch controls", async ({ page }) => {
    await page.route("**/api/source-apps/status", async (route) => {
      await route.fulfill({ json: fluiddStatus() });
    });
    await page.route("**/api/source-apps/fluidd/install", async (route) => {
      await route.fulfill({
        json: {
          app_id: "fluidd",
          ok: true,
          status: "installed",
          method: "npm-build",
          state: fluiddStatus("installed").apps[0].install_state,
        },
      });
    });
    await page.route("**/api/source-apps/fluidd/launch", async (route) => {
      await route.fulfill({
        json: {
          app_id: "fluidd",
          ok: true,
          state: fluiddStatus().apps[0].process_state,
          url: "/static/fluidd/",
        },
      });
    });

    await page.goto("/");
    await page.locator("#sourceGroupTabs [data-source-group='print_farm']").click();
    await page.locator("button.source-module-card").filter({ hasText: "Fluidd" }).click();

    const actionWindow = page.locator("#actionWindow");
    await expect(actionWindow).toBeVisible();
    await expect(actionWindow).toHaveAttribute("data-item-id", "fluidd");
    await expect(actionWindow.locator(".action-window__title")).toHaveText("Fluidd");
    await expect(actionWindow.locator("[data-panel-id='facts']")).toContainText("npm-build");
    await expect(actionWindow.locator("[data-panel-id='facts']")).toContainText("running at /static/fluidd/");
    await expect(actionWindow.getByRole("button", { name: "Install" })).toBeVisible();
    const launchButton = actionWindow.locator("[data-action-id='launch-app']");
    await expect(launchButton).toHaveText("Open");

    await launchButton.click();
    await expect(page.locator("#sourceDownloadState")).toContainText("Fluidd: running at /static/fluidd/");
  });
});
