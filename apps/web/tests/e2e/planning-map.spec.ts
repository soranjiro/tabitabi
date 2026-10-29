import { test, expect } from '@playwright/test';

test.use({ serviceWorkers: 'block' });

test.beforeEach(async ({ page }) => {
  await page.route('https://tile.openstreetmap.org/**', route => route.fulfill({
    contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"/>',
  }));
  await page.goto('/demo/planning-map');
});

test('legacy map opens three views and cards open details before editing', async ({ page }) => {
  await expect(page.getByRole('navigation', { name: '表示切り替え' }).getByRole('button')).toHaveText(['計画', '地図', '日程']);
  await expect(page.locator('.leaflet-marker-icon')).toHaveCount(5);
  await page.getByRole('button', { name: '計画', exact: true }).click();
  await page.locator('.step-main').filter({ hasText: '南禅寺' }).click();
  await expect(page.getByRole('dialog', { name: '予定詳細' })).toBeVisible();
  await expect(page.getByRole('dialog', { name: '予定を編集' })).toHaveCount(0);
  await page.getByRole('dialog', { name: '予定詳細' }).getByRole('button', { name: '編集', exact: true }).click();
  await expect(page.getByRole('dialog', { name: '予定を編集' })).toBeVisible();
});

test('title-only, date-only and overnight steps persist', async ({ page }) => {
  await page.getByRole('button', { name: '計画', exact: true }).click();
  await page.getByRole('button', { name: '＋ 予定を追加' }).first().click();
  await page.getByLabel('タイトル', { exact: true }).fill('京都でカフェ巡り');
  await page.getByRole('button', { name: '追加', exact: true }).click();
  await page.locator('.step-main').filter({ hasText: '京都でカフェ巡り' }).click();
  await expect(page.getByRole('dialog', { name: '予定詳細' })).toContainText('未定');
  await page.getByRole('dialog', { name: '予定詳細' }).getByRole('button', { name: '閉じる' }).click();

  await page.getByRole('button', { name: '＋ 予定を追加' }).first().click();
  await page.getByLabel('タイトル', { exact: true }).fill('清水寺');
  await page.getByLabel('日付だけ').check();
  await page.getByLabel('開始日').fill('2026-10-15');
  await page.getByRole('button', { name: '追加', exact: true }).click();
  await page.locator('.step-main').filter({ hasText: '清水寺' }).click();
  await expect(page.getByRole('dialog', { name: '予定詳細' })).toContainText('日付決定（時刻未定）');
  await page.getByRole('dialog', { name: '予定詳細' }).getByRole('button', { name: '閉じる' }).click();

  await page.getByRole('button', { name: '＋ 予定を追加' }).first().click();
  await page.getByLabel('タイトル', { exact: true }).fill('夜行バス');
  await page.getByLabel('日時まで').check();
  await page.getByLabel('開始日').fill('2026-10-14');
  await page.getByLabel('開始時刻').fill('23:30');
  await page.getByLabel('終了時刻').fill('07:00');
  await page.getByRole('button', { name: /翌日 07:00 として設定/ }).click();
  await page.getByRole('button', { name: '追加', exact: true }).click();
  await page.locator('.step-main').filter({ hasText: '夜行バス' }).click();
  await expect(page.getByRole('dialog', { name: '予定詳細' })).toContainText('2026/10/15 07:00');
  await page.reload();
  await page.getByRole('button', { name: '計画', exact: true }).click();
  await expect(page.locator('.step-main').filter({ hasText: '夜行バス' })).toBeVisible();
});

test('mobile map keeps the list separate and allows pin-only removal', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('.leaflet-marker-icon').first().click();
  await expect(page.locator('.map-card')).toBeVisible();
  await page.locator('.map-card').getByRole('button', { name: '位置を修正' }).click();
  await expect(page.getByRole('dialog', { name: 'ピンの位置を修正' })).toBeVisible();
  await page.getByRole('button', { name: 'ピンを外す' }).click();
  await expect(page.locator('.leaflet-marker-icon')).toHaveCount(4);
  await page.getByRole('button', { name: '計画', exact: true }).click();
  await expect(page.locator('.step-main')).toHaveCount(5);
  await expect(page.locator('.desktop-map')).toBeHidden();
});

test('related links open from details without opening the editor', async ({ page }) => {
  await page.getByRole('button', { name: '計画', exact: true }).click();
  await page.getByRole('button', { name: '＋ 予定を追加' }).first().click();
  await page.getByLabel('タイトル', { exact: true }).fill('公式サイトを確認');
  await page.getByRole('button', { name: '＋ メモ・リンクなどを追加' }).click();
  await page.getByLabel('リンク').fill('https://example.com/visit');
  await page.getByRole('button', { name: '追加', exact: true }).click();
  await page.locator('.step-main').filter({ hasText: '公式サイトを確認' }).click();
  const link = page.getByRole('dialog', { name: '予定詳細' }).getByRole('link', { name: /example.com.*開く/ });
  await expect(link).toHaveAttribute('href', 'https://example.com/visit');
  await expect(link).toHaveAttribute('target', '_blank');
  await expect(page.getByRole('dialog', { name: '予定を編集' })).toHaveCount(0);
});

test('schedule day date stays within its badge on narrow screens', async ({ page }) => {
  await page.getByRole('button', { name: '計画', exact: true }).click();
  await page.getByRole('button', { name: '＋ 予定を追加' }).first().click();
  await page.getByLabel('タイトル', { exact: true }).fill('日付表示の確認');
  await page.getByLabel('日付だけ').check();
  await page.getByLabel('開始日').fill('2026-10-17');
  await page.getByRole('button', { name: '追加', exact: true }).click();
  await page.getByRole('button', { name: '日程', exact: true }).click();

  const dateLabel = page.locator('.preview-day > header strong').filter({ hasText: '10/17' });
  await expect(dateLabel).toHaveText('10/17');
  for (const width of [320, 390, 1024]) {
    await page.setViewportSize({ width, height: 844 });
    const fits = await dateLabel.evaluate((node) => {
      const label = node.getBoundingClientRect();
      const badge = node.parentElement!.getBoundingClientRect();
      return label.left >= badge.left - 1 && label.right <= badge.right + 1;
    });
    expect(fits, `date should fit inside the day badge at ${width}px`).toBe(true);
  }
});
