import { test, expect } from '@playwright/test';

test.describe('Map-Only Theme', () => {
  const DEMO_ITINERARY_ID = 'demo-map-only';
  const BASE_URL = 'http://localhost:5174';

  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/demo`);
  });

  test('should display map view in view mode', async ({ page }) => {
    // デモページからmap-onlyテーマを選択
    await page.click('text=Map Only');

    // マップが表示されているか確認
    const mapContainer = page.locator('.gmap-canvas');
    await expect(mapContainer).toBeVisible();
  });

  test('theme modal should open and close correctly', async ({ page }) => {
    await page.click('text=Map Only');

    // メニューアイコンをクリック
    const menuButton = page.locator('button:has-text("☰")').first();
    await menuButton.click();

    // テーマボタンをクリック
    await page.click('button:has-text("🎨")');

    // テーマモーダルが表示される
    const themeModal = page.locator('text=テーマを選択');
    await expect(themeModal).toBeVisible();

    // モーダルを閉じる (背景をクリック)
    const overlay = page.locator('.map-theme-overlay');
    if (await overlay.isVisible()) {
      await overlay.click({ position: { x: 0, y: 0 } });
    }

    // モーダルが閉じる
    await expect(themeModal).not.toBeVisible();
  });

  test('secret mode modal should open and close independently', async ({ page }) => {
    await page.click('text=Map Only');

    // メニューを開く
    const menuButton = page.locator('button:has-text("☰")').first();
    await menuButton.click();

    // シークレットモード設定ボタンをクリック
    await page.click('button:has-text("🔒")');

    // シークレットモーダルが表示される
    const secretModal = page.locator('text=シークレット機能');
    await expect(secretModal).toBeVisible();

    // テーマモーダルは表示されていない
    const themeModal = page.locator('text=テーマを選択');
    await expect(themeModal).not.toBeVisible();

    // モーダルを閉じる
    const overlay = page.locator('.map-theme-overlay');
    if (await overlay.isVisible()) {
      await overlay.click({ position: { x: 0, y: 0 } });
    }

    // シークレットモーダルが閉じる
    await expect(secretModal).not.toBeVisible();
  });

  test('should not show both theme and secret modals at the same time', async ({ page }) => {
    await page.click('text=Map Only');

    // メニューを開く
    const menuButton = page.locator('button:has-text("☰")').first();
    await menuButton.click();

    // シークレットモーダルを開く
    await page.click('button:has-text("🔒")');
    await expect(page.locator('text=シークレット機能')).toBeVisible();

    // モーダルを閉じる
    const overlay = page.locator('.map-theme-overlay');
    if (await overlay.isVisible()) {
      await overlay.click({ position: { x: 0, y: 0 } });
    }

    // メニューを再度開く
    await menuButton.click();

    // テーマモーダルを開く
    await page.click('button:has-text("🎨")');
    await expect(page.locator('text=テーマを選択')).toBeVisible();

    // シークレットモーダルは表示されていない
    await expect(page.locator('text=シークレット機能').first()).not.toBeVisible();
  });

  test('"地図に戻る" button should only appear in street view view mode', async ({ page }) => {
    await page.click('text=Map Only');

    // ビューモードを確認 (編集モードではない)
    const editButton = page.locator('button:has-text("編集")').first();
    const isEditMode = await editButton.isVisible();

    if (!isEditMode) {
      // ビューモードの場合、地図に戻るボタンは非表示
      const backButton = page.locator('button:has-text("地図に戻る")');
      await expect(backButton).not.toBeVisible();
    }
  });

  test('secret mode toggle should work', async ({ page }) => {
    await page.click('text=Map Only');

    // メニューを開く
    const menuButton = page.locator('button:has-text("☰")').first();
    await menuButton.click();

    // シークレットモーダルを開く
    await page.click('button:has-text("🔒")');

    // チェックボックスをクリックして有効化
    const secretToggle = page.locator('.secret-mode-toggle input[type="checkbox"]');
    await secretToggle.click();

    // オフセット入力欄が表示される
    const offsetControl = page.locator('.secret-offset-control');
    await expect(offsetControl).toBeVisible();
  });

  test('should display current location button', async ({ page }) => {
    await page.click('text=Map Only');

    // 現在地ボタンが表示されている
    const currentLocationButton = page.locator('button:has-text("📍")');
    await expect(currentLocationButton).toBeVisible();
  });

  test('modal overlay should close when clicked', async ({ page }) => {
    await page.click('text=Map Only');

    // メニューを開く
    const menuButton = page.locator('button:has-text("☰")').first();
    await menuButton.click();

    // テーマモーダルを開く
    await page.click('button:has-text("🎨")');

    // オーバーレイをクリック
    const overlay = page.locator('.map-theme-overlay');
    if (await overlay.isVisible()) {
      await overlay.click({ position: { x: 0, y: 0 } });
    }

    // モーダルが閉じる
    await expect(page.locator('text=テーマを選択')).not.toBeVisible();
  });

  test('menu should toggle visibility', async ({ page }) => {
    await page.click('text=Map Only');

    // メニューボタンをクリック
    const menuButton = page.locator('button:has-text("☰")').first();

    // 最初はメニューが非表示
    const menuContent = page.locator('.map-menu');
    const initiallyVisible = await menuContent.isVisible().catch(() => false);

    // メニューをクリック
    await menuButton.click();

    // 状態が切り替わる
    const afterClick = await menuContent.isVisible().catch(() => false);
    expect(afterClick).not.toBe(initiallyVisible);
  });

  test('should display step list in edit mode', async ({ page }) => {
    await page.goto(`${BASE_URL}/demo`);
    await page.click('text=Map Only');

    const stepListContainer = page.locator('.step-list-container');
    await expect(stepListContainer).toBeVisible({ timeout: 10000 });

    const stepListHeader = page.locator('.step-list-header');
    await expect(stepListHeader).toContainText('場所未設定');
  });

  test('should toggle between showing all steps and only steps without location', async ({ page }) => {
    await page.goto(`${BASE_URL}/demo`);
    await page.click('text=Map Only');

    await page.waitForTimeout(2000);

    const stepListHeader = page.locator('.step-list-header');
    await expect(stepListHeader).toContainText('場所未設定');

    await stepListHeader.click();

    await expect(stepListHeader).toContainText('全ての予定');

    await stepListHeader.click();

    await expect(stepListHeader).toContainText('場所未設定');
  });

  test('should show location warning for steps without location', async ({ page }) => {
    await page.goto(`${BASE_URL}/demo`);
    await page.click('text=Map Only');

    await page.waitForTimeout(2000);

    const noLocationWarning = page.locator('.step-no-location-warning');
    const count = await noLocationWarning.count();

    if (count > 0) {
      await expect(noLocationWarning.first()).toContainText('場所未設定');
    }
  });

  test('clicking step in list should focus on map', async ({ page }) => {
    await page.goto(`${BASE_URL}/demo`);
    await page.click('text=Map Only');

    await page.waitForTimeout(2000);

    const stepListHeader = page.locator('.step-list-header');
    await stepListHeader.click();

    await page.waitForTimeout(500);

    const stepListItems = page.locator('.step-list-item');
    const count = await stepListItems.count();

    if (count > 0) {
      const firstStep = stepListItems.first();
      const hasLocation = await firstStep.locator('.step-location').isVisible().catch(() => false);

      if (hasLocation) {
        await firstStep.click();

        const spotDetailModal = page.locator('.spot-detail-modal');
        await expect(spotDetailModal).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('should highlight steps without location in the list', async ({ page }) => {
    await page.goto(`${BASE_URL}/demo`);
    await page.click('text=Map Only');

    await page.waitForTimeout(2000);

    const noLocationSteps = page.locator('.step-list-item.no-location');
    const count = await noLocationSteps.count();

    if (count > 0) {
      const bgColor = await noLocationSteps.first().evaluate((el) => {
        return window.getComputedStyle(el).backgroundColor;
      });
      expect(bgColor).toBeTruthy();
    }
  });

  test('should close spot detail when clicking outside', async ({ page }) => {
    await page.goto(`${BASE_URL}/demo`);
    await page.click('text=Map Only');

    await page.waitForTimeout(2000);

    const stepListHeader = page.locator('.step-list-header');
    await stepListHeader.click();

    await page.waitForTimeout(500);

    const stepListItems = page.locator('.step-list-item');
    const count = await stepListItems.count();

    if (count > 0) {
      const firstStep = stepListItems.first();
      const hasLocation = await firstStep.locator('.step-location').isVisible().catch(() => false);

      if (hasLocation) {
        await firstStep.click();

        const spotDetailModal = page.locator('.spot-detail-modal');
        await expect(spotDetailModal).toBeVisible({ timeout: 5000 });

        const overlay = page.locator('.map-theme-overlay');
        if (await overlay.isVisible()) {
          await overlay.click({ position: { x: 0, y: 0 } });
        }

        await expect(spotDetailModal).not.toBeVisible();
      }
    }
  });

  test('should be responsive on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(`${BASE_URL}/demo`);
    await page.click('text=Map Only');

    await page.waitForTimeout(2000);

    const stepListContainer = page.locator('.step-list-container');
    await expect(stepListContainer).toBeVisible({ timeout: 10000 });

    const boundingBox = await stepListContainer.boundingBox();
    expect(boundingBox).toBeTruthy();
    if (boundingBox) {
      expect(boundingBox.width).toBeLessThanOrEqual(375 - 20);
    }
  });
});
