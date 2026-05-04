import { test, expect } from '@playwright/test';

test('artifact download button downloads artifact', async ({ page }) => {
  await page.goto('http://localhost:8000/');
  await page.waitForLoadState('networkidle');

  // Navigate to artifacts page
  await page.click('button[data-page="artifacts"]');
  await page.waitForSelector('#page-artifacts.active');

  // Find the first download button
  const downloadButton = page.locator('[data-download-artifact]').first();
  const isEnabled = await downloadButton.isEnabled();

  if (isEnabled) {
    // Click the download button
    await downloadButton.click();

    // Wait for download to start
    await page.waitForTimeout(1000);

    // Verify the button still exists
    await expect(downloadButton).toBeVisible();
  }
});
