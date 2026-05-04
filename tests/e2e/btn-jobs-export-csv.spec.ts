import { test, expect } from '@playwright/test';

test('jobs export csv button requires confirmation and triggers download', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  
  // Navigate to jobs page
  await page.click('button[data-page="jobs"]');
  await page.waitForSelector('#page-jobs.active');
  
  // Handle download
  const downloadPromise = page.waitForEvent('download');
  
  // Handle confirmation dialog
  page.on('dialog', async dialog => {
    expect(dialog.type()).toBe('confirm');
    expect(dialog.message()).toContain('Export all jobs to CSV');
    await dialog.accept();
  });
  
  // Click export CSV button
  await page.click('#jobsExportCsvBtn');
  
  // Wait for download
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/hermes3d-jobs-\d{8}-\d{6}\.csv/);
});
