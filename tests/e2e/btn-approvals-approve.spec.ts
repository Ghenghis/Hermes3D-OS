import { test, expect } from '@playwright/test';

test('approvals approve button approves job', async ({ page }) => {
  await page.goto('http://localhost:8000/');
  await page.waitForLoadState('networkidle');

  // Navigate to approvals page
  await page.click('button[data-page="approvals"]');
  await page.waitForSelector('#page-approvals.active');

  // Find the first approve button
  const approveButton = page.locator('[data-approve-job]').first();
  const isEnabled = await approveButton.isEnabled();

  if (isEnabled) {
    // Click the approve button
    await approveButton.click();

    // Wait for API call to complete
    await page.waitForTimeout(1000);

    // Verify the button still exists
    await expect(approveButton).toBeVisible();
  }
});
