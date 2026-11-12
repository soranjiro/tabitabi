import { expect, test } from '@playwright/test';

const apiBaseUrl = process.env.PREVIEW_API_URL;

test('ChatGPT editing opens inside the current itinerary and carries existing plans', async ({ page, request }) => {
  test.skip(!apiBaseUrl, 'PREVIEW_API_URL is required for deployed-preview smoke testing');
  test.setTimeout(60_000);
  const created = await request.post(apiBaseUrl + '/itineraries', {
    data: { title: 'ChatGPT Preview旅程', theme_id: 'planning-draft' },
  });
  expect(created.ok()).toBeTruthy();
  const { data } = await created.json();
  const { id, token } = data as { id: string; token: string };
  try {
    const added = await request.post(apiBaseUrl + '/steps', {
      headers: { Authorization: 'Bearer ' + token },
      data: { itinerary_id: id, title: '清水寺を見学', start_at: null, end_at: null, location: '京都' },
    });
    expect(added.ok()).toBeTruthy();

    await page.goto('/itineraries/' + id + '?token=' + encodeURIComponent(token), { waitUntil: 'networkidle' });
    const menu = page.getByRole('button', { name: 'メニュー' });
    const menuContent = page.locator('.standard-more-menu');
    // SSR buttons can appear before hydration; wait for the click to become interactive.
    let opened = false;
    for (let attempt = 0; attempt < 5; attempt++) {
      await menu.click();
      if (await menuContent.isVisible()) { opened = true; break; }
      await page.waitForTimeout(300);
    }
    expect(opened, 'the itinerary menu should open after hydration').toBe(true);
    await menuContent.getByRole('button', { name: /ChatGPTで考える/ }).click();
    const dialog = page.locator('.standard-dialog').filter({ has: page.getByRole('heading', { name: 'ChatGPTで考える' }) });
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('.planner-current strong')).toHaveText('ChatGPT Preview旅程');
    await dialog.getByLabel('相談・変更したいこと（任意）').fill('2日目の午後を見直したい');
    const link = dialog.getByRole('link', { name: /ChatGPTでこのしおりを編集/ });
    const url = new URL((await link.getAttribute('href'))!);
    expect(url.hostname).toBe('chatgpt.com');
    const draft = url.searchParams.get('q') ?? '';
    expect(draft).toContain(id);
    expect(draft).toContain('清水寺を見学');
    expect(draft).toContain('2日目の午後を見直したい');
    expect(draft).not.toContain(token);

    await dialog.getByRole('checkbox', { name: /既存の予定もChatGPTに渡す/ }).uncheck();
    const withoutPlans = new URL((await link.getAttribute('href'))!).searchParams.get('q') ?? '';
    expect(withoutPlans).not.toContain('清水寺を見学');
    await dialog.getByRole('button', { name: 'プロンプトをコピー' }).click();
    await dialog.getByRole('button', { name: '閉じる' }).click();
    await expect(dialog).toBeHidden();
    await expect(page).toHaveURL(new RegExp('/itineraries/' + id));
  } finally {
    try {
      await request.delete(apiBaseUrl + '/itineraries/' + id, {
        headers: { Authorization: 'Bearer ' + token },
        timeout: 10_000,
      });
    } catch (error) {
      console.warn('Failed to clean up preview itinerary:', error);
    }
  }
});

test('deployed MCP exposes metadata but blocks anonymous changes', async ({ request }) => {
  test.skip(!apiBaseUrl, 'PREVIEW_API_URL is required for deployed-preview smoke testing');
  const root = new URL(apiBaseUrl!).origin;
  const metadata = await request.get(root + '/.well-known/oauth-authorization-server');
  expect(metadata.ok()).toBeTruthy();
  const document = await metadata.json();
  expect(document.code_challenge_methods_supported).toContain('S256');
  const result = await request.post(root + '/mcp', {
    data: { jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'add_step', arguments: { itinerary_id: 'unknown', title: 'no', start_at: null } } },
  });
  expect(result.status()).toBe(401);
  expect(result.headers()['www-authenticate']).toContain('oauth-protected-resource');
});
