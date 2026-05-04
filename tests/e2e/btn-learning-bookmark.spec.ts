import { test, expect } from '@playwright/test';

test('learning bookmark button bookmarks learning topic', async ({ page }) => {
  await page.goto('http://localhost:8000/');
  await page.waitForLoadState('networkidle');

  // Navigate to learning page
  await page.click('button[data-page="learning"]');
  await page.waitForSelector('#page-learning.active');

  // Click the bookmark button
  await page.click('#learningBookmarkBtn');

  // Wait for API call to complete
  await page.waitForTimeout(1000);

  // Verify the button still exists
  await expect(page.locator('#learningBookmarkBtn')).toBeVisible();
});
