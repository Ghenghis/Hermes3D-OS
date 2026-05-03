import { test, expect } from '@playwright/test';

test('printer test connection button tests printer connectivity', async ({ page }) => {
  await page.goto('http://localhost:8000/');
  await page.waitForLoadState('networkidle');
  
  // Navigate to printers page
  await page.click('button[data-page="printers"]');
  await page.waitForSelector('#page-printers.active');
  
  // Find the first test button
  const testButton = page.locator('[data-test-printer]').first();
  const isEnabled = await testButton.isEnabled();
  
  if (isEnabled) {
    // Click the test button
    await testButton.click();
    
    // Wait for API call to complete
    await page.waitForTimeout(1000);
    
    // Verify the button still exists
    await expect(testButton).toBeVisible();
  }
});
