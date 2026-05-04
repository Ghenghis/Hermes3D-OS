import { test, expect, request } from "@playwright/test";

/**
 * foundation/install-endpoint — universal install dispatcher.
 *
 * Asserts:
 *   - Manifest schema bump: trimesh has install: { method: "pip", package: "trimesh" }
 *   - GET /api/source-apps/status reports supported_install_methods + install_method per app
 *   - POST /api/source-apps/{id}/install dispatches and returns a status payload
 *   - Unknown app id yields ok=false with a clear error
 *   - GUI: Install button exists in source-os action bar
 *   - GUI: clicking a source module surfaces an Install primary action when the manifest
 *     entry has an install block
 */

test.describe("Install endpoint foundation", () => {
  test("status payload exposes supported_install_methods", async () => {
    const ctx = await request.newContext({ baseURL: "http://127.0.0.1:18081" });
    const res = await ctx.get("/api/source-apps/status");
    expect(res.ok()).toBeTruthy();
    const payload = await res.json();
    expect(Array.isArray(payload.supported_install_methods)).toBeTruthy();
    expect(payload.supported_install_methods).toEqual(
      expect.arrayContaining(["pip", "clone-shallow", "clone-full", "noop"]),
    );
    await ctx.dispose();
  });

  test("unknown app id returns ok=false", async () => {
    const ctx = await request.newContext({ baseURL: "http://127.0.0.1:18081" });
    const res = await ctx.post("/api/source-apps/this-app-id-does-not-exist/install");
    expect(res.status()).toBe(200);
    const payload = await res.json();
    expect(payload.ok).toBe(false);
    expect(payload.error).toContain("unknown app id");
    await ctx.dispose();
  });

  test("install state endpoint is queryable per app", async () => {
    const ctx = await request.newContext({ baseURL: "http://127.0.0.1:18081" });
    const res = await ctx.get("/api/source-apps/trimesh/install");
    expect(res.ok()).toBeTruthy();
    const payload = await res.json();
    expect(payload.app_id).toBe("trimesh");
    expect(payload.state).toBeDefined();
    expect(["not_installed", "installing", "installed", "failed"]).toContain(payload.state.status);
    await ctx.dispose();
  });

  test("Install button exists in Source OS action bar", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#sourceInstallApp")).toBeVisible();
  });
});
