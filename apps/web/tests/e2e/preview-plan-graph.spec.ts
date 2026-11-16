import { expect, test } from '@playwright/test';

const apiBaseUrl = process.env.PREVIEW_API_URL;

test('deployed planning graph splits, merges, compares alternatives and publishes read-only', async ({ page, request }) => {
  test.skip(!apiBaseUrl, 'PREVIEW_API_URL is required');
  test.setTimeout(120_000);
  page.setDefaultTimeout(12_000);
  const title = '分岐プラン Preview ' + Date.now();
  const create = await request.post(apiBaseUrl + '/itineraries', {
    data: { title, password: 'graph-test-' + Date.now(), theme_id: 'planning-draft', palette_id: 'neutral' },
  });
  expect(create.status()).toBe(201);
  const { id, token } = (await create.json()).data as { id: string; token: string };
  const headers = { Authorization: 'Bearer ' + token };

  async function pick(label: string) {
    const card = page.locator('.graph-node').filter({ hasText: label });
    const button = card.locator('.node-main');
    if (await button.getAttribute('aria-pressed') !== 'true') await button.click();
  }

  async function addStep(label: string) {
    const dialog = page.getByRole('dialog', { name: '分岐プランの予定' });
    await expect(dialog).toBeVisible();
    await dialog.getByLabel('タイトル').fill(label);
    await dialog.getByRole('button', { name: '保存', exact: true }).click();
    await expect(dialog).toBeHidden();
    await expect(page.locator('.graph-node').filter({ hasText: label })).toBeVisible();
  }

  try {
    await page.goto('/itineraries/' + id + '?token=' + encodeURIComponent(token));
    await expect(page.getByRole('button', { name: title })).toBeVisible();
    await expect(page.getByRole('heading', { name: '予定', exact: true })).toBeVisible();

    // Create a root and branch twice. Both child routes can remain independently visible.
    await page.getByRole('button', { name: '＋ 予定を追加' }).click();
    await addStep('東京集合');
    await page.getByRole('button', { name: /ここから分岐/ }).click();
    await addStep('プランA');
    await pick('東京集合');
    await page.getByRole('button', { name: /ここから分岐/ }).click();
    await addStep('プランB');

    // Merge A into B while retaining the separate direct root -> B route.
    await pick('プランA');
    await page.getByLabel('この予定から合流').selectOption({ label: 'プランB' });
    await page.getByRole('button', { name: '接続', exact: true }).click();
    let result = await request.get(apiBaseUrl + '/itineraries/' + id + '/plan-graph', { headers });
    expect(result.ok()).toBeTruthy();
    let graph = (await result.json()).data;
    expect(graph.nodes).toHaveLength(3);
    expect(graph.edges).toHaveLength(3);
    await page.screenshot({ path: 'test-results/plan-graph-branches.png', fullPage: false });

    // Fold and reopen a branch, without deleting any nodes or links.
    await page.locator('.graph-node').filter({ hasText: '東京集合' }).locator('.node-main').click();
    await page.locator('.branches button').filter({ hasText: '閉じる' }).first().click();
    await expect(page.getByText('2件を表示')).toBeVisible();
    await page.locator('.branches button').filter({ hasText: '展開' }).first().click();
    await expect(page.getByText('3件を表示')).toBeVisible();

    // Hotel and flight alternatives live inside existing steps without a second schedule.
    await pick('プランB');
    await page.getByRole('button', { name: /候補を追加/ }).first().click();
    const candidateDialog = page.getByRole('dialog', { name: '候補の編集' });
    await candidateDialog.getByLabel('タイトル').fill('京都駅前ホテル');
    await candidateDialog.getByLabel('メモ').fill('朝食付き・予約番号: ABCD1234');
    await candidateDialog.getByLabel('リンク').fill('https://example.com/booking?token=private');
    await candidateDialog.getByRole('button', { name: '保存', exact: true }).click();
    await expect(candidateDialog).toBeHidden();
    await page.locator('.graph-node').filter({ hasText: 'プランB' }).getByRole('button', { name: /比較する/ }).click();
    await expect(page.getByText('京都駅前ホテル')).toBeVisible();

    await page.reload();
    await expect(page.locator('.graph-node')).toHaveCount(3);

    // Public snapshots are detached, sanitized and cannot be edited.
    const publish = await request.post(apiBaseUrl + '/itineraries/' + id + '/publish', { headers });
    expect(publish.ok()).toBeTruthy();
    const publicId = (await publish.json()).data.id as string;
    const publicGraphResult = await request.get(apiBaseUrl + '/itineraries/' + publicId + '/plan-graph');
    expect(publicGraphResult.ok()).toBeTruthy();
    const snapshot = (await publicGraphResult.json()).data;
    expect(snapshot.nodes).toHaveLength(3);
    expect(JSON.stringify(snapshot)).not.toContain('ABCD1234');
    expect(JSON.stringify(snapshot)).not.toContain('token=private');

    await page.goto('/itineraries/' + publicId);
    await expect(page.locator('.graph-node')).toHaveCount(3);
    await expect(page.getByRole('button', { name: '＋ 予定を追加' })).toHaveCount(0);
    await page.screenshot({ path: 'test-results/plan-graph-public.png', fullPage: false });
  } finally {
    try { await request.delete(apiBaseUrl + '/itineraries/' + id, { headers }); }
    catch (error) { console.warn('preview-graph-cleanup-failed=' + String(error)); }
  }
});
