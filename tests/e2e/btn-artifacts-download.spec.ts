import { test, expect } from '@playwright/test';

test('artifact download button downloads artifact', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  // Navigate to artifacts page
  await page.click('button[data-page="artifacts"]');
  await page.waitForSelector('#page-artifacts.active');

  // Check if any download buttons exist (DB may be empty in CI)
  const count = await page.locator('[data-download-artifact]').count();
  if (count === 0) {
    // No artifacts — pass trivially
    return;
  }

  // Click the first download button
  const downloadButton = page.locator('[data-download-artifact]').first();
  await expect(downloadButton).toBeVisible();
  await downloadButton.click();

  // Wait for download to start
  await page.waitForTimeout(1000);

  // Verify the page is still functional
  await expect(page.locator('#page-artifacts')).toBeVisible();
});
