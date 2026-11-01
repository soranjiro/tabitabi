import { expect, test } from '@playwright/test';

const apiBaseUrl = process.env.PREVIEW_API_URL;

test('ChatGPT planning page opens a populated unsent draft and handles an empty itinerary', async ({ page, request }) => {
  test.skip(!apiBaseUrl, 'PREVIEW_API_URL is required for deployed-preview smoke testing');
  test.setTimeout(60_000);
  const created = await request.post(apiBaseUrl + '/itineraries', {
    data: { title: 'ChatGPT Preview旅程', theme_id: 'standard-spring' },
  });
  expect(created.ok()).toBeTruthy();
  const { data } = await created.json();
  const { id, token } = data as { id: string; token: string };
  try {
    await page.goto('/plan-with-chatgpt?itinerary=' + encodeURIComponent(id));
    await expect(page.getByRole('heading', { name: /ChatGPT と/ })).toBeVisible();
    await expect(page.getByText('ChatGPT Preview旅程')).toBeVisible();
    await expect(page.getByText('予定はまだありません。', { exact: false })).toBeVisible();
    await page.getByLabel('旅について伝えたいこと（任意）').fill('東京へ2泊で行きたい');
    const link = page.getByRole('link', { name: /ChatGPTで考える/ });
    const url = new URL((await link.getAttribute('href'))!);
    expect(url.hostname).toBe('chatgpt.com');
    const draft = url.searchParams.get('q') ?? '';
    expect(draft).toContain(id);
    expect(draft).toContain('東京へ2泊で行きたい');
    expect(draft).not.toContain(token);
    await page.getByRole('button', { name: 'プロンプトをコピー' }).click();
  } finally {
    await request.delete(apiBaseUrl + '/itineraries/' + id, {
      headers: { Authorization: 'Bearer ' + token },
    });
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
