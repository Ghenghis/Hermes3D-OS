import { test, expect } from "@playwright/test";

test.describe("UI Settings", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("font scale persists across reloads", async ({ page }) => {
    await page.click('button[data-page="settings"]');
    await page.waitForSelector("#fontScaleSlider");
    
    const slider = page.locator("#fontScaleSlider");
    const valueDisplay = page.locator("#fontScaleValue");
    
    await slider.fill("1.5");
    await expect(valueDisplay).toHaveText("1.5x");
    
    await page.reload();
    await page.click('button[data-page="settings"]');
    await page.waitForSelector("#fontScaleSlider");
    
    await expect(slider).toHaveValue("1.5");
    await expect(valueDisplay).toHaveText("1.5x");
  });

  test("font family persists across reloads", async ({ page }) => {
    await page.click('button[data-page="settings"]');
    await page.waitForSelector("#fontFamilySelect");
    
    const select = page.locator("#fontFamilySelect");
    await select.selectOption("monospace");
    
    await page.reload();
    await page.click('button[data-page="settings"]');
    await page.waitForSelector("#fontFamilySelect");
    
    await expect(select).toHaveValue("monospace");
  });

  test("theme persists across reloads", async ({ page }) => {
    await page.click('button[data-page="settings"]');
    await page.waitForSelector("#uiPanelThemeSelect");
    
    const select = page.locator("#uiPanelThemeSelect");
    await select.selectOption("alloy");
    
    await expect(page.locator("body")).toHaveAttribute("data-theme", "alloy");
    
    await page.reload();
    await page.click('button[data-page="settings"]');
    await page.waitForSelector("#uiPanelThemeSelect");
    
    await expect(select).toHaveValue("alloy");
    await expect(page.locator("body")).toHaveAttribute("data-theme", "alloy");
  });

  test("telemetry toggle persists across reloads", async ({ page }) => {
    await page.click('button[data-page="settings"]');
    await page.waitForSelector("#telemetrySelect");
    
    const select = page.locator("#telemetrySelect");
    await select.selectOption("true");
    
    await page.reload();
    await page.click('button[data-page="settings"]');
    await page.waitForSelector("#telemetrySelect");
    
    await expect(select).toHaveValue("true");
  });

  test("reset button restores default font scale", async ({ page }) => {
    await page.click('button[data-page="settings"]');
    await page.waitForSelector("#fontScaleSlider");
    
    const slider = page.locator("#fontScaleSlider");
    const valueDisplay = page.locator("#fontScaleValue");
    
    await slider.fill("1.5");
    await expect(valueDisplay).toHaveText("1.5x");
    
    await page.click('button[data-reset="font_scale"]');
    
    await expect(slider).toHaveValue("1.0");
    await expect(valueDisplay).toHaveText("1.0x");
  });

  test("reset button restores default font family", async ({ page }) => {
    await page.click('button[data-page="settings"]');
    await page.waitForSelector("#fontFamilySelect");
    
    const select = page.locator("#fontFamilySelect");
    await select.selectOption("monospace");
    
    await page.click('button[data-reset="font_family"]');
    
    await expect(select).toHaveValue("system-ui");
  });

  test("reset button restores default theme", async ({ page }) => {
    await page.click('button[data-page="settings"]');
    await page.waitForSelector("#uiPanelThemeSelect");
    
    const select = page.locator("#uiPanelThemeSelect");
    await select.selectOption("alloy");
    
    await page.click('button[data-reset="theme"]');
    
    await expect(select).toHaveValue("midnight");
    await expect(page.locator("body")).toHaveAttribute("data-theme", "midnight");
  });

  test("reset button restores default telemetry", async ({ page }) => {
    await page.click('button[data-page="settings"]');
    await page.waitForSelector("#telemetrySelect");
    
    const select = page.locator("#telemetrySelect");
    await select.selectOption("true");
    
    await page.click('button[data-reset="telemetry_enabled"]');
    
    await expect(select).toHaveValue("false");
  });
});
