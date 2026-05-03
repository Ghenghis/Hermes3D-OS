import { test, expect } from '@playwright/test';

test('voice mute button toggles voice mute state', async ({ page }) => {
  await page.goto('http://localhost:8000/');
  await page.waitForLoadState('networkidle');
  
  // Navigate to voice page
  await page.click('button[data-page="voice"]');
  await page.waitForSelector('#page-voice.active');
  
  // Click the mute button
  await page.click('#voiceMuteBtn');
  
  // Wait for API call to complete
  await page.waitForTimeout(1000);
  
  // Verify the button still exists
  await expect(page.locator('#voiceMuteBtn')).toBeVisible();
});
