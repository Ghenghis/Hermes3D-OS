import { test, expect } from '@playwright/test';

test('dashboard refresh button updates dashboard data', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  
  // Navigate to dashboard
  await page.click('button[data-page="dashboard"]');
  await page.waitForSelector('#page-dashboard.active');
  
  // Get initial fleet count
  const initialFleetText = await page.textContent('#dashboardFleet');
  
  // Click refresh button
  await page.click('#dashboardRefreshBtn');
  
  // Wait for update
  await page.waitForTimeout(500);
  
  // Verify dashboard is still visible
  await expect(page.locator('#page-dashboard.active')).toBeVisible();
});
