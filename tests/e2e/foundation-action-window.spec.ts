import { test, expect } from "@playwright/test";

/**
 * foundation/action-window — universal Action Window contract.
 *
 * Asserts:
 *   - #actionWindow exists and starts hidden
 *   - dispatching a synthetic actionwindow:render event populates the slot
 *   - clicking a real Source OS module card dispatches and renders
 *   - the close button hides the window
 */

test.describe("Action Window foundation", () => {
  test("element exists and starts hidden", async ({ page }) => {
    await page.goto("/");
    const aw = page.locator("#actionWindow");
    await expect(aw).toBeAttached();
    await expect(aw).toBeHidden();
  });

  test("synthetic dispatch populates the window", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      window.HermesActionWindow.dispatch({
        tab_id: "test",
        kind: "app",
        item_id: "smoke-1",
        title: "Synthetic Title",
        subtitle: "synthetic-subtitle",
        status_pill: { text: "ok-pill", tone: "ok" },
        primary_actions: [{ id: "p1", label: "Primary One" }],
        secondary_actions: [{ id: "s1", label: "Secondary One" }],
        panels: [{ id: "facts", label: "Facts", body_html: "<em>body-mark</em>" }],
      });
    });
    const aw = page.locator("#actionWindow");
    await expect(aw).toBeVisible();
    await expect(aw.locator(".action-window__title")).toHaveText("Synthetic Title");
    await expect(aw.locator(".action-window__subtitle")).toHaveText("synthetic-subtitle");
    await expect(aw.locator(".action-window__pill")).toHaveText("ok-pill");
    await expect(aw.getByRole("button", { name: "Primary One" })).toBeVisible();
    await expect(aw.getByRole("button", { name: "Secondary One" })).toBeVisible();
    await expect(aw.locator("em")).toHaveText("body-mark");
  });

  test("source-os module click dispatches to action window", async ({ page }) => {
    await page.goto("/");
    // Source OS is the default-active page
    const firstModule = page.locator("button.source-module-card").first();
    await firstModule.waitFor({ state: "visible", timeout: 10_000 });
    const moduleName = (await firstModule.locator("b").textContent())?.trim() ?? "";
    await firstModule.click();
    const aw = page.locator("#actionWindow");
    await expect(aw).toBeVisible();
    await expect(aw.locator(".action-window__title")).toHaveText(moduleName);
    await expect(aw).toHaveAttribute("data-tab-id", "sources");
    await expect(aw).toHaveAttribute("data-kind", "app");
  });

  test("close button hides the window", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      window.HermesActionWindow.dispatch({
        tab_id: "test",
        kind: "app",
        item_id: "x",
        title: "Closable",
        primary_actions: [],
        panels: [],
      });
    });
    const aw = page.locator("#actionWindow");
    await expect(aw).toBeVisible();
    await aw.locator("[data-action-window-close]").click();
    await expect(aw).toBeHidden();
  });
});
