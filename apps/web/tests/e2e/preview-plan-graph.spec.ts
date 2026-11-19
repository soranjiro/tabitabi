import { expect, test } from '@playwright/test';

const apiBaseUrl = process.env.PREVIEW_API_URL;

test('classic single-column planning remains usable on mobile, then branches and publishes', async ({ page, request }) => {
  test.skip(!apiBaseUrl, 'PREVIEW_API_URL is required');
  test.setTimeout(120_000);
  page.setDefaultTimeout(12_000);
  const title = '通常・分岐 Preview ' + Date.now();
  const create = await request.post(apiBaseUrl + '/itineraries', {
    data: { title, password: 'graph-test-' + Date.now(), theme_id: 'planning-draft', palette_id: 'neutral' },
  });
  expect(create.status()).toBe(201);
  const { id, token } = (await create.json()).data as { id: string; token: string };
  const headers = { Authorization: 'Bearer ' + token };

  async function addBranch(label: string) {
    const dialog = page.getByRole('dialog', { name: '予定を追加' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('radio', { name: 'まだ決めない' })).toBeChecked();
    await dialog.getByLabel('タイトル').fill(label);
    await dialog.getByRole('button', { name: '追加', exact: true }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByText(label, { exact: true }).first()).toBeVisible();
  }
  async function pick(label: string) {
    // On mobile, the selected Step is edited in a modal bottom sheet.
    const panel = page.locator('.detail-panel');
    if (await panel.isVisible()) await panel.getByRole('button', { name: '閉じる', exact: true }).first().click();
    const button = page.locator('.mobile-compare .stop-card').filter({
      has: page.locator('.stop-title strong').getByText(label, { exact: true }),
    });
    if (await button.getAttribute('aria-pressed') !== 'true') await button.click();
  }

  try {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/itineraries/' + id + '?token=' + encodeURIComponent(token));
    await expect(page.getByRole('button', { name: title })).toBeVisible();

    // The same planning UI as before: undated section, searchable list and native Step editor.
    await expect(page.getByRole('button', { name: '＋ 予定を追加' }).first()).toBeVisible();
    await expect(page.locator('.graph-scroll')).toHaveCount(0);
    await page.getByRole('button', { name: '＋ 予定を追加' }).first().click();
    const nativeDialog = page.getByRole('dialog', { name: '予定を追加' });
    await expect(nativeDialog).toBeVisible();
    await nativeDialog.getByLabel('タイトル').fill('東京集合');
    await expect(nativeDialog.getByRole('radio', { name: 'まだ決めない' })).toBeChecked();
    await nativeDialog.getByRole('button', { name: '追加', exact: true }).click();
    await expect(nativeDialog).toBeHidden();
    await expect(page.getByText('まだ決めていない')).toBeVisible();
    await expect(page.locator('.step-main').filter({ hasText: '東京集合' })).toBeVisible();
    await expect(page.locator('.graph-scroll')).toHaveCount(0);
    expect(await page.locator('main').last().evaluate(el => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(2);
    await page.screenshot({ path: 'test-results/plan-single-mobile.png', fullPage: false });

    // The first candidate still looks like a normal scheduled step. A second branch enables the graph.
    await page.getByRole('button', { name: '東京集合から分岐' }).click();
    await addBranch('プランA');
    await expect(page.locator('.graph-scroll')).toHaveCount(0);
    await page.getByRole('button', { name: '東京集合から分岐' }).click();
    await addBranch('プランB');
    await expect(page.locator('.graph-node')).toHaveCount(3);
    await expect(page.locator('.mobile-compare')).toBeVisible();
    await expect(page.locator('.mobile-compare .route-heading')).toHaveCount(2);
    await expect(page.getByRole('button', { name: '縦一覧' })).toHaveCount(0);
    await expect(page.locator('.graph-scroll')).toBeHidden();
    await expect(page.locator('.mobile-compare .stop-card')).toHaveCount(3);
    await page.screenshot({ path: 'test-results/plan-branches-mobile.png', fullPage: false });
    // Both branches have a persistent + action at their ends. Continue the second
    // branch without selecting its card or scrolling to a separate detail panel.
    await expect(page.getByRole('button', { name: 'プランBの次の予定を追加' })).toBeVisible();
    await page.getByRole('button', { name: 'プランBの次の予定を追加' }).click();
    await addBranch('プランBの続き');
    await expect(page.locator('.graph-node')).toHaveCount(4);
    await expect(page.getByRole('button', { name: 'プランBの続きの次の予定を追加' })).toBeVisible();
    await page.screenshot({ path: 'test-results/plan-second-route-continued.png', fullPage: false });

    await pick('プランA');
    await expect(page.locator('.detail-panel h3')).toHaveText('プランA');
    await page.getByLabel('この予定から合流').selectOption({ label: 'プランB' });
    await expect(page.locator('.detail-panel h3')).toHaveText('プランA');
    await page.getByRole('button', { name: '接続', exact: true }).click();
    await expect.poll(async () => {
      const response = await request.get(apiBaseUrl + '/itineraries/' + id + '/plan-graph', { headers });
      return (await response.json()).data.edges.length;
    }, { timeout: 15_000 }).toBe(4);
    const result = await request.get(apiBaseUrl + '/itineraries/' + id + '/plan-graph', { headers });
    const graph = (await result.json()).data;
    expect(graph.nodes).toHaveLength(4);
    expect(graph.edges).toHaveLength(4);

    await pick('東京集合');
    await page.locator('.branches button').filter({ hasText: '閉じる' }).first().click();
    await expect(page.locator('.mobile-compare .stop-card')).toHaveCount(3);
    await page.locator('.branches button').filter({ hasText: '展開' }).first().click();
    await expect(page.locator('.mobile-compare .stop-card')).toHaveCount(4);

    // Inline comparison belongs to the same Step.
    await pick('プランB');
    await page.getByRole('button', { name: '◇ 候補を追加' }).click();
    const candidateDialog = page.getByRole('dialog', { name: '候補の編集' });
    await candidateDialog.getByLabel('タイトル').fill('京都駅前ホテル');
    await candidateDialog.getByLabel('メモ').fill('朝食付き・予約番号: ABCD1234');
    await candidateDialog.getByLabel('リンク').fill('https://example.com/booking?token=private');
    await candidateDialog.getByRole('button', { name: '保存', exact: true }).click();
    await expect(candidateDialog).toBeHidden();
    // The candidate sidebar remains accessible without the removed vertical canvas.
    if (await page.locator('.detail-panel').isVisible()) {
      await page.locator('.detail-panel').getByRole('button', { name: '閉じる', exact: true }).first().click();
    }
    await expect(page.locator('.mobile-compare .stop-card')).toHaveCount(4);
    await expect(page.getByText('京都駅前ホテル').first()).toBeVisible();
    const sidebarOption = page.locator('.comparison-sidebar .option-card').filter({ hasText: '京都駅前ホテル' });
    await expect(sidebarOption).toBeVisible();
    await sidebarOption.getByRole('button', { name: /メモ/ }).click();
    await expect(sidebarOption.getByLabel('京都駅前ホテルのメモ')).toContainText('朝食付き');
    await expect(sidebarOption.getByRole('link', { name: '京都駅前ホテルのリンクを開く' }))
      .toHaveAttribute('href', 'https://example.com/booking?token=private');

    await page.reload();
    await expect(page.locator('.graph-node')).toHaveCount(4);
    const publish = await request.post(apiBaseUrl + '/itineraries/' + id + '/publish', { headers });
    expect(publish.ok()).toBeTruthy();
    const publicId = (await publish.json()).data.id as string;
    const publicGraphResult = await request.get(apiBaseUrl + '/itineraries/' + publicId + '/plan-graph');
    expect(publicGraphResult.ok()).toBeTruthy();
    const snapshot = (await publicGraphResult.json()).data;
    expect(snapshot.nodes).toHaveLength(4);
    expect(JSON.stringify(snapshot)).not.toContain('ABCD1234');
    expect(JSON.stringify(snapshot)).not.toContain('token=private');

    await page.goto('/itineraries/' + publicId);
    await expect(page.locator('.mobile-compare')).toBeVisible();
    await expect(page.getByRole('button', { name: '縦一覧' })).toHaveCount(0);
    await expect(page.locator('.mobile-compare .stop-card')).toHaveCount(4);
    await expect(page.getByRole('button', { name: 'プランBの続きの次の予定を追加' })).toBeVisible();
    await expect(page.getByRole('button', { name: '＋ 新しいプラン' })).toBeVisible();
    await page.screenshot({ path: 'test-results/plan-graph-public.png', fullPage: false });
  } finally {
    try { await request.delete(apiBaseUrl + '/itineraries/' + id, { headers }); }
    catch (error) { console.warn('preview-graph-cleanup-failed=' + String(error)); }
  }
});
