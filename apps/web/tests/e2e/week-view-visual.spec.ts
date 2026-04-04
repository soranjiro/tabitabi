import { test } from '@playwright/test';

test('@quick week view visualization', async ({ page }) => {
  // Go to demo page
  await page.goto('http://localhost:5173/?demo=true', { waitUntil: 'networkidle', timeout: 10000 });
  
  // Wait for content to fully load
  await page.waitForTimeout(2000);
  
  // Try to access the mode selector button (view mode switch)
  const buttons = await page.locator('button').all();
  let found = false;
  for (const btn of buttons) {
    const text = await btn.textContent();
    if (text && text.includes('Mode')) {
      await btn.click();
      found = true;
      break;
    }
  }
  
  if (!found) {
    // Try using aria-label for Mode button
    const modeBtn = page.locator('[aria-label*="mode"]').first();
    if (await modeBtn.isVisible()) {
      await modeBtn.click();
    }
  }
  
  await page.waitForTimeout(500);
  
  // Look for week view button
  const options = await page.locator('[role="button"], button').all();
  for (const opt of options) {
    const text = await opt.textContent();
    if (text && text.includes('Week')) {
      await opt.click();
      break;
    }
  }
  
  await page.waitForTimeout(1000);
  
  // Check if week view is visible and take screenshot
  const weekView = page.locator('.standard-autumn-week-view').first();
  if (await weekView.isVisible()) {
    console.log('✅ Week view is visible');
    await page.screenshot({ path: 'week-view-demo.png', fullPage: true });
  } else {
    console.log('❌ Week view is not visible');
    await page.screenshot({ path: 'week-view-missing.png', fullPage: true });
  }
});
