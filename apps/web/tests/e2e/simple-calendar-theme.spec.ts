import { test, expect } from '@playwright/test';

test.describe('Simple Calendar Theme', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load the simple calendar theme', async ({ page }) => {
    await page.click('text=テーマで選ぶ');
    await page.click('button:has-text("demo")');

    await page.waitForSelector('text=シンプルカレンダー');
    await page.click('text=シンプルカレンダー');

    await page.waitForNavigation();

    const themeContainer = page.locator('.simple-calendar-theme');
    await expect(themeContainer).toBeVisible();
  });

  test('should display date header with step count', async ({ page }) => {
    await page.click('text=テーマで選ぶ');
    await page.click('button:has-text("demo")');

    await page.waitForSelector('text=シンプルカレンダー');
    await page.click('text=シンプルカレンダー');

    await page.waitForNavigation();

    const dateHeader = page.locator('.date-header');
    await expect(dateHeader).toBeVisible();

    const stepCount = page.locator('.step-count');
    const countText = await stepCount.first().textContent();
    expect(countText).toMatch(/\d+件/);
  });

  test('should display steps in timeline view', async ({ page }) => {
    await page.click('text=テーマで選ぶ');
    await page.click('button:has-text("demo")');

    await page.waitForSelector('text=シンプルカレンダー');
    await page.click('text=シンプルカレンダー');

    await page.waitForNavigation();

    const stepItems = page.locator('.step-item');
    const count = await stepItems.count();
    expect(count).toBeGreaterThan(0);

    const firstStepTitle = page.locator('.step-title').first();
    await expect(firstStepTitle).toBeVisible();
  });

  test('should show edit and delete buttons when hovering over step', async ({ page }) => {
    await page.click('text=テーマで選ぶ');
    await page.click('button:has-text("demo")');

    await page.waitForSelector('text=シンプルカレンダー');
    await page.click('text=シンプルカレンダー');

    await page.waitForNavigation();

    const firstStep = page.locator('.step-item').first();
    await firstStep.hover();

    const editBtn = firstStep.locator('.btn-edit');
    const deleteBtn = firstStep.locator('.btn-delete');

    await expect(editBtn).toBeVisible();
    await expect(deleteBtn).toBeVisible();
  });

  test('should display location if available', async ({ page }) => {
    await page.click('text=テーマで選ぶ');
    await page.click('button:has-text("demo")');

    await page.waitForSelector('text=シンプルカレンダー');
    await page.click('text=シンプルカレンダー');

    await page.waitForNavigation();

    const location = page.locator('.step-location').first();
    const isVisible = await location.isVisible().catch(() => false);

    if (isVisible) {
      await expect(location).toContainText('📍');
    }
  });

  test('should display view mode selector buttons', async ({ page }) => {
    await page.click('text=テーマで選ぶ');
    await page.click('button:has-text("demo")');

    await page.waitForSelector('text=シンプルカレンダー');
    await page.click('text=シンプルカレンダー');

    await page.waitForNavigation();

    const viewModeSelector = page.locator('.view-mode-selector');
    await expect(viewModeSelector).toBeVisible();

    const listBtn = viewModeSelector.locator('button:has-text("リスト")');
    const weekBtn = viewModeSelector.locator('button:has-text("週")');
    const monthBtn = viewModeSelector.locator('button:has-text("月")');

    await expect(listBtn).toBeVisible();
    await expect(weekBtn).toBeVisible();
    await expect(monthBtn).toBeVisible();
  });

  test('should have simple and clean UI layout', async ({ page }) => {
    await page.click('text=テーマで選ぶ');
    await page.click('button:has-text("demo")');

    await page.waitForSelector('text=シンプルカレンダー');
    await page.click('text=シンプルカレンダー');

    await page.waitForNavigation();

    const headerElement = page.locator('.header');
    const mainContent = page.locator('.main-content');

    await expect(headerElement).toBeVisible();
    await expect(mainContent).toBeVisible();

    const headerHeight = await headerElement.boundingBox();
    const mainHeight = await mainContent.boundingBox();

    expect(headerHeight).toBeTruthy();
    expect(mainHeight).toBeTruthy();
  });
});
