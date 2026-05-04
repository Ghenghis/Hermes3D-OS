import { test, expect } from "@playwright/test";

const triposrStatus = (installStatus = "not_installed") => ({
  source_root: "G:\\Github\\Hermes3D\\apps",
  supported_install_methods: ["clone-full-venv"],
  apps: [
    {
      id: "triposr",
      name: "TripoSR",
      source_path: "G:\\Github\\Hermes3D\\apps\\generation\\TripoSR",
      source_exists: installStatus === "installed",
      source_has_git: installStatus === "installed",
      cli_executable: "",
      installed_executable: "",
      install_method: "clone-full-venv",
      install_status: installStatus,
      install_state: {
        status: installStatus,
        log_tail: installStatus === "installed" ? ["clone + venv requirements ok"] : [],
        error: null,
      },
      embed_mode: "native-window-bridge-required",
      ui_host: "Hermes3D resizable Source OS workbench",
      safe_actions: ["inspect source"],
    },
  ],
});

test.describe("TripoSR app install slot", () => {
  test("backend exposes TripoSR install metadata", async ({ request }) => {
    const statusRes = await request.get("/api/source-apps/status");
    expect(statusRes.ok()).toBeTruthy();
    const statusPayload = await statusRes.json();
    expect(statusPayload.supported_install_methods).toEqual(expect.arrayContaining(["clone-full-venv"]));

    const triposr = statusPayload.apps.find((app) => app.id === "triposr");
    expect(triposr).toBeTruthy();
    expect(triposr.install_method).toBe("clone-full-venv");

    const installStateRes = await request.get("/api/source-apps/triposr/install");
    expect(installStateRes.ok()).toBeTruthy();
    const installStatePayload = await installStateRes.json();
    expect(installStatePayload.app_id).toBe("triposr");
    expect(["not_installed", "installing", "installed", "failed"]).toContain(installStatePayload.state.status);
  });

  test("Source OS install action reaches installed pill", async ({ page }) => {
    let installStatus = "not_installed";

    await page.route("**/api/source-apps/status", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(triposrStatus(installStatus)),
      });
    });

    await page.route("**/api/source-apps/triposr/install", async (route) => {
      if (route.request().method() === "POST") {
        installStatus = "installed";
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            app_id: "triposr",
            ok: true,
            status: "installed",
            method: "clone-full-venv",
            state: triposrStatus("installed").apps[0].install_state,
          }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ app_id: "triposr", state: triposrStatus(installStatus).apps[0].install_state }),
      });
    });

    await page.goto("/");
    await page.locator("#sourceGroupTabs [data-source-group='generation']").click();
    await page.locator("button.source-module-card").filter({ hasText: "TripoSR" }).click();

    const aw = page.locator("#actionWindow");
    await expect(aw).toBeVisible();
    await expect(aw.locator(".action-window__title")).toHaveText("TripoSR");
    await expect(aw.getByRole("button", { name: "Install" })).toBeVisible();
    await expect(aw.locator("[data-panel-id='readme']")).toContainText("MIT-licensed");
    await expect(aw.locator("[data-panel-id='license']")).toContainText("MIT");

    await aw.getByRole("button", { name: "Install" }).click();
    await expect(aw.locator(".action-window__pill")).toHaveText("installed", { timeout: 60_000 });
    await expect(page.locator("#sourceDownloadState")).toContainText("TripoSR: install installed");
  });
});
