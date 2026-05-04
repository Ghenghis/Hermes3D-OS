import { test, expect } from "@playwright/test";

/**
 * setting/reference-app-cards
 *
 * Verifies that Source OS renders reference-priority modules with:
 *   - CSS class `source-module-card--reference` on the card button
 *   - A "Ref" badge element inside the card (`source-module-card__badge--reference`)
 *   - A `data-priority` attribute matching the module's priority value
 *   - A "Reference Apps" section header above reference cards
 *
 * Task ID: HP3D-WINDSURF-5-REF-CARDS-2026-05-03
 */

// A minimal /api/source-apps/status stub so tests are backend-independent.
const minimalStatus = {
  source_root: "source-lab/sources",
  supported_install_methods: ["clone-shallow"],
  apps: [],
};

test.describe("Reference App Cards (setting/reference-app-cards)", () => {
  test.beforeEach(async ({ page }) => {
    // Stub status endpoint to avoid backend dependency
    await page.route("**/api/source-apps/status", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(minimalStatus),
      });
    });
  });

  test("reference cards have source-module-card--reference CSS class", async ({ page }) => {
    await page.goto("/");
    // Navigate to slicers group which has several reference-priority modules
    // (e.g. SuperSlicer, Slic3r, BambuStudio, MatterControl, Kiri:Moto)
    await page.locator("#sourceGroupTabs [data-source-group='slicers']").click();

    const refCards = page.locator("button.source-module-card.source-module-card--reference");
    await expect(refCards.first()).toBeVisible({ timeout: 10_000 });
    // There are ≥5 reference-priority slicers in the manifest
    const count = await refCards.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test("reference cards carry data-priority attribute", async ({ page }) => {
    await page.goto("/");
    await page.locator("#sourceGroupTabs [data-source-group='slicers']").click();

    const refCard = page.locator("button.source-module-card--reference").first();
    await expect(refCard).toBeVisible({ timeout: 10_000 });
    const priority = await refCard.getAttribute("data-priority");
    // Priority must be one of the reference-class values
    expect(["reference", "research", "future", "catalog"]).toContain(priority);
  });

  test("reference cards contain a Ref badge", async ({ page }) => {
    await page.goto("/");
    await page.locator("#sourceGroupTabs [data-source-group='slicers']").click();

    const firstRefCard = page.locator("button.source-module-card--reference").first();
    await expect(firstRefCard).toBeVisible({ timeout: 10_000 });

    const badge = firstRefCard.locator(".source-module-card__badge--reference");
    await expect(badge).toBeVisible();
    await expect(badge).toHaveText("Ref");
  });

  test("non-reference cards do not have the reference CSS class", async ({ page }) => {
    await page.goto("/");
    await page.locator("#sourceGroupTabs [data-source-group='slicers']").click();

    // PrusaSlicer and OrcaSlicer are priority=primary — should NOT be reference
    const prusaCard = page.locator("button.source-module-card").filter({ hasText: "PrusaSlicer" });
    await expect(prusaCard).toBeVisible({ timeout: 10_000 });
    await expect(prusaCard).not.toHaveClass(/source-module-card--reference/);

    const orcaCard = page.locator("button.source-module-card").filter({ hasText: "OrcaSlicer" });
    await expect(orcaCard).not.toHaveClass(/source-module-card--reference/);
  });

  test("Reference Apps section header appears when reference modules exist", async ({ page }) => {
    await page.goto("/");
    await page.locator("#sourceGroupTabs [data-source-group='slicers']").click();

    const header = page.locator(".source-module-section-header[data-section='reference']");
    await expect(header).toBeVisible({ timeout: 10_000 });
    await expect(header).toHaveText("Reference Apps");
  });

  test("reference cards appear under the Reference Apps section header", async ({ page }) => {
    await page.goto("/");
    await page.locator("#sourceGroupTabs [data-source-group='slicers']").click();

    // The section header must come before reference cards in the DOM
    const moduleList = page.locator("#sourceModuleList");
    await expect(moduleList).toBeVisible({ timeout: 10_000 });

    // Evaluate DOM order: header index < first ref card index
    const order = await moduleList.evaluate((list) => {
      const children = [...list.children];
      const headerIdx = children.findIndex(
        (el) => el.classList.contains("source-module-section-header") && el.dataset.section === "reference",
      );
      const firstRefIdx = children.findIndex(
        (el) => el.classList.contains("source-module-card--reference"),
      );
      return { headerIdx, firstRefIdx };
    });

    expect(order.headerIdx).toBeGreaterThanOrEqual(0);
    expect(order.firstRefIdx).toBeGreaterThan(order.headerIdx);
  });

  test("firmware group also shows reference cards for reference-priority entries", async ({ page }) => {
    await page.goto("/");
    await page.locator("#sourceGroupTabs [data-source-group='firmware']").click();

    const refCards = page.locator("button.source-module-card--reference");
    await expect(refCards.first()).toBeVisible({ timeout: 10_000 });
    const count = await refCards.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });
});
