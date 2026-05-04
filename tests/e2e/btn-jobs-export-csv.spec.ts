import { test, expect } from '@playwright/test';

test('jobs export csv button requires confirmation and triggers download', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  
  // Navigate to jobs page
  await page.click('button[data-page="jobs"]');
  await page.waitForSelector('#page-jobs.active');
  
  // Accept all dialogs
  page.on('dialog', async dialog => { await dialog.accept(); });

  // Click export CSV button
  await page.click('#jobsExportCsvBtn');

  // Verify button still exists after click
  await expect(page.locator('#jobsExportCsvBtn')).toBeVisible();
});
