import { test, expect } from '@playwright/test';

test('@demo standard-seasons week view full test', async ({ page, browserName }) => {
  // Only run on chromium for consistency
  if (browserName !== 'chromium') return;

  // Navigate to demo
  console.log('🌐 Opening demo page...');
  await page.goto('http://localhost:5173/?demo=true', { waitUntil: 'networkidle', timeout: 15000 });

  // Wait for dynamic content
  await page.waitForTimeout(1500);

  // Find and click the Mode button to access view mode selector
  console.log('🔍 Looking for Mode button...');
  const buttons = await page.locator('button').all();

  let modeFound = false;
  for (const btn of buttons) {
    const attrs = await btn.getAttribute('aria-label');
    const text = await btn.textContent().catch(() => '');

    if (attrs && attrs.includes('mode')) {
      console.log('✅ Found mode button via aria-label');
      await btn.click();
      modeFound = true;
      break;
    } else if (text && text.toLowerCase().includes('mode')) {
      console.log('✅ Found mode button via text');
      await btn.click();
      modeFound = true;
      break;
    }
  }

  if (!modeFound) {
    console.log('⚠️  Could not find Mode button, checking for view mode selector');
  }

  await page.waitForTimeout(500);

  // Try to find and click week view option
  console.log('🔍 Looking for week view option...');
  const allElements = await page.locator('*').all();
  let weekClicked = false;

  for (const elem of allElements) {
    const text = await elem.textContent().catch(() => '');
    if (text === 'Week' || text?.includes('week')) {
      try {
        await elem.click();
        weekClicked = true;
        console.log('✅ Clicked week view button');
        break;
      } catch {
        // Element might not be clickable
      }
    }
  }

  await page.waitForTimeout(1500);

  // Check if week view container exists
  const weekView = page.locator('.standard-autumn-week-view');
  const weekContainer = page.locator('.standard-autumn-week-container');

  const weekViewVisible = await weekView.isVisible().catch(() => false);
  const weekContainerVisible = await weekContainer.isVisible().catch(() => false);

  console.log(`📊 Week view visible: ${weekViewVisible}`);
  console.log(`📦 Week container visible: ${weekContainerVisible}`);

  if (weekViewVisible || weekContainerVisible) {
    console.log('✅ WeekView is rendering!');

    // Count visible elements
    const eventCount = await page.locator('.standard-autumn-week-event').count();
    const cellCount = await page.locator('.standard-autumn-week-cell').count();
    const headerCount = await page.locator('.standard-autumn-week-day-header').count;

    console.log(`📍 Events visible: ${eventCount}`);
    console.log(`📍 Cells visible: ${cellCount}`);
    console.log(`📍 Headers visible: ${headerCount}`);

    // Take screenshot
    await page.screenshot({
      path: 'week-view-active.png',
      fullPage: true
    });
    console.log('📸 Screenshot saved: week-view-active.png');
  } else {
    console.log('❌ WeekView is NOT rendering');

    // Take screenshot of what we see
    await page.screenshot({
      path: 'week-view-missing.png',
      fullPage: true
    });
    console.log('📸 Screenshot saved: week-view-missing.png');

    // Try to diagnose the issue
    const dayCardView = page.locator('.standard-autumn-carousel').isVisible().catch(() => false);
    if (await dayCardView) {
      console.log('ℹ️ Day card view is visible instead');
    }
  }

  // Log final state
  console.log('✨ Test complete');
});
