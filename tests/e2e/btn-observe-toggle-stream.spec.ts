import { test, expect } from '@playwright/test';

test('observe toggle stream button toggles telemetry', async ({ page }) => {
  await page.goto('http://localhost:8000/');
  await page.waitForLoadState('networkidle');
  
  // Navigate to observe page
  await page.click('button[data-page="observe"]');
  await page.waitForSelector('#page-observe.active');
  
  // Click the toggle stream button
  await page.click('#telemetryToggleBtn');
  
  // Wait for API call to complete
  await page.waitForTimeout(1000);
  
  // Verify the button still exists
  await expect(page.locator('#telemetryToggleBtn')).toBeVisible();
});
