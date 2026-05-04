import { test, expect } from "@playwright/test";

test("source OS group tab click filters module list", async ({ page }) => {
  // Stub source manifest with two groups so chip clicks are testable
  await page.route("**/static/source_manifest.json**", route =>
    route.fulfill({
      json: {
        sourceRoot: "source-lab/sources",
        groups: {
          slicers: [
            { id: "prusaslicer", name: "PrusaSlicer", priority: "primary", uxSection: "Slicers", license: "AGPL-3.0" },
          ],
          modelers: [
            { id: "blender", name: "Blender", priority: "primary", uxSection: "Modelers", license: "GPL-2.0" },
          ],
        },
      },
    })
  );
  await page.route("**/api/source-apps/status", route => route.fulfill({ json: { apps: [] } }));

  await page.goto("/");
  await page.waitForSelector("#sourceGroupTabs button[data-source-group]");

  const groupChips = page.locator("#sourceGroupTabs button[data-source-group]");
  const chipCount = await groupChips.count();
  expect(chipCount).toBeGreaterThan(0);

  // Click the first chip — it should gain the active class
  await groupChips.first().click();
  await expect(groupChips.first()).toHaveClass(/active/);

  // If there is a second chip, clicking it should become active and first loses active
  if (chipCount > 1) {
    await groupChips.nth(1).click();
    await expect(groupChips.nth(1)).toHaveClass(/active/);
    await expect(groupChips.first()).not.toHaveClass(/active/);

    // Module list should update to show the selected group's module
    await expect(page.locator("#sourceGroupTitle")).not.toBeEmpty();
  }
});

test("source OS group tab selection persists in localStorage", async ({ page }) => {
  await page.route("**/static/source_manifest.json**", route =>
    route.fulfill({
      json: {
        sourceRoot: "source-lab/sources",
        groups: {
          slicers: [{ id: "prusaslicer", name: "PrusaSlicer", priority: "primary", uxSection: "Slicers", license: "AGPL-3.0" }],
          modelers: [{ id: "blender", name: "Blender", priority: "primary", uxSection: "Modelers", license: "GPL-2.0" }],
        },
      },
    })
  );
  await page.route("**/api/source-apps/status", route => route.fulfill({ json: { apps: [] } }));

  await page.goto("/");
  await page.waitForSelector("#sourceGroupTabs button[data-source-group]");

  const groupChips = page.locator("#sourceGroupTabs button[data-source-group]");
  const chipCount = await groupChips.count();

  if (chipCount > 1) {
    await groupChips.nth(1).click();
    const secondGroup = await groupChips.nth(1).getAttribute("data-source-group");

    // Verify localStorage was written
    const stored = await page.evaluate(() => localStorage.getItem("hermes3d.sourceGroupFilter"));
    expect(stored).toBe(secondGroup);
  }
});
