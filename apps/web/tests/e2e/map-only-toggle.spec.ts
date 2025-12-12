import { test, expect } from '@playwright/test';

test.describe('Map-Only Step List Toggle', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/demo?theme=map-only');
  });

  test('should toggle step list and be responsive', async ({ page }) => {
    await page.waitForTimeout(2000);
    await page.waitForTimeout(3000);

    const stepListHeader = page.locator('.step-list-header');
    await expect(stepListHeader).toBeVisible({ timeout: 10000 });

    const initialText = await stepListHeader.textContent();
    console.log('Initial text:', initialText);
    expect(initialText).toContain('場所未設定');

    await stepListHeader.click();
    await page.waitForTimeout(500);

    const expandedText = await stepListHeader.textContent();
    console.log('Expanded text:', expandedText);
    expect(expandedText).toContain('全ての予定');

    await stepListHeader.click();
    await page.waitForTimeout(500);

    const collapsedText = await stepListHeader.textContent();
    console.log('Collapsed text:', collapsedText);
    expect(collapsedText).toContain('場所未設定');

    console.log('✅ Desktop view test passed');
  });

  test('mobile viewport should be responsive', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/demo?theme=map-only');
    await page.waitForTimeout(3000);

    const stepListContainer = page.locator('.step-list-container');
    await expect(stepListContainer).toBeVisible({ timeout: 10000 });

    const boundingBox = await stepListContainer.boundingBox();
    console.log('Mobile container width:', boundingBox?.width);

    expect(boundingBox).toBeTruthy();
    if (boundingBox) {
      expect(boundingBox.width).toBeLessThanOrEqual(375);
    }

    console.log('✅ Mobile view test passed');
  });
});
