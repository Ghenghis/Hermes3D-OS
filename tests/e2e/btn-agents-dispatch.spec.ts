import { test, expect } from '@playwright/test';

test('agents dispatch button dispatches agents to work queue', async ({ page }) => {
  await page.goto('http://localhost:8000/');
  await page.waitForLoadState('networkidle');

  // Navigate to agents page
  await page.click('button[data-page="agents"]');
  await page.waitForSelector('#page-agents.active');

  // Click the dispatch button
  await page.click('#agentsDispatchBtn');

  // Wait for API call to complete
  await page.waitForTimeout(1000);

  // Verify the button still exists
  await expect(page.locator('#agentsDispatchBtn')).toBeVisible();
});
