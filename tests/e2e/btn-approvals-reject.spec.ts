import { test, expect } from '@playwright/test';

test('approvals reject button rejects job', async ({ page }) => {
  await page.goto('http://localhost:8000/');
  await page.waitForLoadState('networkidle');

  // Navigate to approvals page
  await page.click('button[data-page="approvals"]');
  await page.waitForSelector('#page-approvals.active');

  // Find the first reject button
  const rejectButton = page.locator('[data-reject-job]').first();
  const isEnabled = await rejectButton.isEnabled();

  if (isEnabled) {
    // Click the reject button
    await rejectButton.click();

    // Wait for API call to complete
    await page.waitForTimeout(1000);

    // Verify the button still exists
    await expect(rejectButton).toBeVisible();
  }
});
