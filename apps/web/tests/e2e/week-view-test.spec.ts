import { test, expect } from '@playwright/test';

test('@demo week view rendering check', async ({ page }) => {
  await page.goto('http://localhost:5173/?demo=true', { waitUntil: 'networkidle' });

  // Wait for the page to load
  await page.waitForTimeout(2000);

  // Look for the Mode button (≣ icon) to access view mode selector
  const modeButtons = await page.locator('[aria-label*="Mode"]').all();
  if (modeButtons.length > 0) {
    await modeButtons[0].click();
    await page.waitForTimeout(500);
  }

  // Try to find and click the week view option
  const weekViewButton = await page.locator('button:has-text("week")').first();
  if (await weekViewButton.isVisible()) {
    await weekViewButton.click();
    await page.waitForTimeout(1000);
  }

  // Take a screenshot to see what's rendered
  await page.screenshot({ path: 'week-view-current.png' });

  // Check if the week view container exists
  const weekContainer = page.locator('.standard-autumn-week-view');
  const isVisible = await weekContainer.isVisible().catch(() => false);
  console.log('Week view container visible:', isVisible);

  // Check if it has content
  const weekElements = await page.locator('.standard-autumn-week-*').count();
  console.log('Week view elements count:', weekElements);
});
