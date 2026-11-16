import { expect, test } from '@playwright/test';

test('planning-draft preserves ordinary Step editing, dates, search and inline comparisons', async ({ page, request }) => {
  const apiBase = process.env.PREVIEW_API_URL;
  test.skip(!apiBase, 'deployed API preview required');
  test.setTimeout(90_000);
  const create = await request.post(apiBase + '/itineraries', {
    data: { title: '通常予定の回帰確認', password: 'preview-' + Date.now(), theme_id: 'planning-draft' },
  });
  expect(create.ok()).toBeTruthy();
  const { id, token } = (await create.json()).data as { id: string; token: string };
  try {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/itineraries/' + id + '?token=' + encodeURIComponent(token));
    await expect(page.getByRole('button', { name: '＋ 予定を追加' }).first()).toBeVisible();
    await page.getByRole('button', { name: '＋ 予定を追加' }).first().click();
    let dialog = page.getByRole('dialog', { name: '予定を追加' });
    await dialog.getByLabel('タイトル').fill('京都散策');
    await dialog.getByRole('radio', { name: '日付だけ' }).check();
    await dialog.getByLabel('開始日').fill('2026-12-10');
    await dialog.getByRole('button', { name: '追加', exact: true }).click();
    await expect(dialog).toBeHidden();
    await expect(page.locator('.section-heading h2').filter({ hasText: '2026/12/10' })).toBeVisible();
    await expect(page.locator('.graph-scroll')).toHaveCount(0);

    await page.getByRole('button', { name: '＋ 予定を追加' }).first().click();
    dialog = page.getByRole('dialog', { name: '予定を追加' });
    await dialog.getByLabel('タイトル').fill('清水寺');
    await dialog.getByRole('button', { name: '追加', exact: true }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByText('まだ決めていない')).toBeVisible();

    const search = page.getByPlaceholder('タイトル・場所');
    await search.fill('京都散策');
    await expect(page.locator('.step-row')).toHaveCount(1);
    await search.clear();
    await expect(page.locator('.step-row')).toHaveCount(2);

    await page.getByRole('button', { name: '京都散策に候補を追加' }).click();
    const candidate = page.getByRole('dialog', { name: '候補の編集' });
    await candidate.getByLabel('タイトル').fill('京都駅前のホテル');
    await candidate.getByLabel('メモ').fill('朝食付き');
    await candidate.getByRole('button', { name: '保存', exact: true }).click();
    await expect(candidate).toBeHidden();
    await expect(page.getByRole('button', { name: /候補 1件/ })).toBeVisible();
    await page.getByRole('button', { name: /候補 1件/ }).click();
    await expect(page.getByText('京都駅前のホテル')).toBeVisible();
    await expect(page.locator('.graph-scroll')).toHaveCount(0);

    const overflow = await page.locator('main').evaluate(element => element.scrollWidth - element.clientWidth);
    expect(overflow).toBeLessThanOrEqual(2);
    await page.screenshot({ path: 'test-results/plan-default-mobile.png', fullPage: false });
  } finally {
    await request.delete(apiBase + '/itineraries/' + id, {
      headers: { Authorization: 'Bearer ' + token },
    }).catch(() => {});
  }
});
