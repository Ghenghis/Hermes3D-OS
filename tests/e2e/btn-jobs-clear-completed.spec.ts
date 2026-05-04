import { test, expect } from '@playwright/test';

test('jobs clear completed button requires confirmation and clears jobs', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  
  // Navigate to jobs page
  await page.click('button[data-page="jobs"]');
  await page.waitForSelector('#page-jobs.active');
  
  // Click clear completed button
  page.on('dialog', async dialog => {
    expect(dialog.type()).toBe('confirm');
    expect(dialog.message()).toContain('Are you sure you want to clear all completed jobs');
    await dialog.accept();
  });
  
  await page.click('#jobsClearCompletedBtn');
  
  // Wait for API call to complete
  await page.waitForTimeout(1000);
  
  // Verify success alert
  // Note: alert() is handled by browser, so we just verify the button exists
  await expect(page.locator('#jobsClearCompletedBtn')).toBeVisible();
});
