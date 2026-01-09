import { expect, test } from '@playwright/test';

const themeChecks: Record<string, (page: import('@playwright/test').Page) => Promise<void>> = {
  'map-only': async (page) => {
    const menuButton = page.getByLabel('Menu');
    await expect(menuButton).toBeVisible({ timeout: 15000 });
    await menuButton.click();
    await expect(page.getByText('新しい予定を追加')).toBeVisible();
  },
  'mapbox-journey': async (page) => {
    await expect(page.locator('.journey-container')).toBeVisible({ timeout: 15000 });
    const addButton = page.getByRole('button', { name: 'スポット追加' });
    await expect(addButton).toBeVisible();
    await addButton.click();
    await expect(page.locator('.form-modal')).toBeVisible();
  },
  'standard-autumn': async (page) => {
    await expect(page.locator('.standard-autumn-theme')).toBeVisible({ timeout: 15000 });
    const addButton = page.getByRole('button', { name: '＋ 予定を追加' });
    await expect(addButton).toBeEnabled();
    await addButton.click();
    await expect(page.getByText('新しい予定を追加')).toBeVisible();
  },
  'ai-generated': async (page) => {
    const mainFab = page.getByLabel('メニュー');
    await expect(mainFab).toBeVisible({ timeout: 15000 });
    await mainFab.click();

    const addButton = page.getByLabel('予定を追加');
    await expect(addButton).toBeVisible({ timeout: 5000 });
    await addButton.click();
    await expect(page.getByText('新しい予定を追加')).toBeVisible();
  },
  shopping: async (page) => {
    await expect(page.locator('.shopping-theme')).toBeVisible({ timeout: 15000 });
    const addButton = page.getByRole('button', { name: '買い物を追加' });
    await expect(addButton).toBeEnabled();
    await addButton.click();
    await expect(page.getByRole('button', { name: '追加する' })).toBeVisible();
  },
  'pixel-quest': async (page) => {
    await expect(page.locator('.pq-container')).toBeVisible({ timeout: 15000 });
    const toggleButton = page.getByRole('button', { name: 'Edit Mode' });
    await expect(toggleButton).toBeVisible();
    await toggleButton.click();
    await expect(page.getByRole('button', { name: '+QUEST' })).toBeVisible();
  },
  'sauna-rally': async (page) => {
    await expect(page.locator('.sauna-rally-theme')).toBeVisible({ timeout: 15000 });
    const addButton = page.getByRole('button', { name: 'サウナを追加' });
    await expect(addButton).toBeVisible();
    await addButton.click();
    await expect(page.getByText('新しい予定を追加')).toBeVisible();
  },
};

for (const themeId of Object.keys(themeChecks)) {
  test.describe(`${themeId} demo`, () => {
    test(`loads and allows editing controls for ${themeId}`, async ({ page }) => {
      await page.goto(`/demo?theme=${themeId}`);
      await themeChecks[themeId](page);
    });
  });
}
