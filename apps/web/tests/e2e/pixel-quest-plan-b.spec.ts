import { expect, test } from '@playwright/test';

test.describe('pixel-quest Plan B branching', () => {
  test.beforeEach(async ({ page }) => {
    // Ensure fresh demo storage for consistent results
    await page.addInitScript(() => {
      try {
        localStorage.clear();
      } catch {}
    });
    // Load pixel-quest demo with Plan B data
    await page.goto('/demo?theme=pixel-quest');
    // Wait for the game container and map to be visible
    await expect(page.locator('.pq-container')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('.map-scroll')).toBeVisible({ timeout: 5000 });
  });

  test('should display Plan A and Plan B markers on the map', async ({ page }) => {
    // Plan A markers should exist (primary path spots)
    const planAMarkers = page.locator('.spot-marker:not(.plan-b)');
    const planACount = await planAMarkers.count();
    expect(planACount).toBeGreaterThan(0);

    // Plan B markers should be visible (with plan-b class)
    const planBMarkers = page.locator('.spot-marker.plan-b');
    const planBCount = await planBMarkers.count();
    expect(planBCount).toBeGreaterThan(0);

    console.log(`Plan A spots: ${planACount}, Plan B spots: ${planBCount}`);
  });

  test('should show branch path connecting Plan A and Plan B', async ({ page }) => {
    // The branching path should be drawn when both plans exist
    // Check for the SVG path element that connects Plan A and B
    const mapSvg = page.locator('.map-canvas svg');
    await expect(mapSvg).toBeVisible();

    // Count path elements (main path + branch path + alternate path)
    const paths = page.locator('.map-canvas svg path');
    const pathCount = await paths.count();
    expect(pathCount).toBeGreaterThan(2); // At least 3 paths: main A, branch, alternate B
  });

  test('should display Plan B label and indicator on Plan B spots', async ({ page }) => {
    // Plan B markers should have a "PLAN B" label and "B" chip
    const planBMarkers = page.locator('.spot-marker.plan-b');
    const firstPlanBMarker = planBMarkers.first();

    // Check for "PLAN B" label
    const planBLabel = firstPlanBMarker.locator('.plan-b-label');
    await expect(planBLabel).toBeVisible();
    await expect(planBLabel).toContainText('PLAN B');

    // Check for "B" indicator chip
    const bChip = firstPlanBMarker.locator('.plan-b-chip');
    await expect(bChip).toBeVisible();
    await expect(bChip).toContainText('B');
  });

  test('should show Plan B steps in minimap with different color', async ({ page }) => {
    // Minimap should show both Plan A and B dots
    const minimapDots = page.locator('.minimap-dot');
    const planBDots = page.locator('.minimap-dot.plan-b');

    const totalDots = await minimapDots.count();
    const planBDotsCount = await planBDots.count();

    expect(totalDots).toBeGreaterThan(0);
    expect(planBDotsCount).toBeGreaterThan(0);
    console.log(`Minimap: Total dots ${totalDots}, Plan B dots ${planBDotsCount}`);
  });

  test('should open detail panel when clicking Plan B marker', async ({ page }) => {
    // Click on a Plan B marker
    const planBMarker = page.locator('.spot-marker.plan-b').first();
    await planBMarker.click();

    // Detail panel should appear
    const detailPanel = page.locator('.detail-popup');
    await expect(detailPanel).toBeVisible({ timeout: 5000 });

    // The panel should show the Plan B step details
    const stepTitle = page.locator('.detail-popup');
    await expect(stepTitle).toContainText(/./); // Contains some text
  });

  test('should switch between Plan A and B without errors', async ({ page }) => {
    // Click on Plan A marker
    const planAMarker = page.locator('.spot-marker:not(.plan-b)').first();
    await planAMarker.click();
    await expect(page.locator('.detail-popup')).toBeVisible({ timeout: 5000 });

    // Close detail panel
    const closeButton = page.locator('.detail-close').first();
    await closeButton.click();
    await expect(page.locator('.detail-popup')).not.toBeVisible({ timeout: 5000 });

    // Click on Plan B marker
    const planBMarker = page.locator('.spot-marker.plan-b').first();
    await planBMarker.click();
    await expect(page.locator('.detail-popup')).toBeVisible({ timeout: 5000 });

    // Panel should display without errors
    const errorMsg = page.locator('[role="alert"]');
    await expect(errorMsg).not.toBeVisible();
  });

  test('should render map without compilation errors', async ({ page }) => {
    // Check console for errors
    let hasConsoleError = false;
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.error(`Console error: ${msg.text()}`);
        hasConsoleError = true;
      }
    });

    // Wait for animation to settle
    await page.waitForTimeout(2000);

    // Take a screenshot for manual verification
    await page.screenshot({ path: 'pixel-quest-plan-b-demo.png' });

    expect(hasConsoleError).toBe(false);
  });
});
