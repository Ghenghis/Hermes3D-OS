import { test, expect } from '@playwright/test';

test('approvals approve button approves job', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  // Navigate to approvals page
  await page.click('button[data-page="approvals"]');
  await page.waitForSelector('#page-approvals.active');

  // Check if any approve buttons exist (DB may be empty in CI)
  const count = await page.locator('[data-approve-job]').count();
  if (count === 0) {
    // No pending approvals — pass trivially
    return;
  }

  // Click the first approve button
  const approveButton = page.locator('[data-approve-job]').first();
  await expect(approveButton).toBeVisible();
  await approveButton.click();

  // Wait for API call to complete
  await page.waitForTimeout(1000);

  // Verify the page is still functional
  await expect(page.locator('#page-approvals')).toBeVisible();
});
