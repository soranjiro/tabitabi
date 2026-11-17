import { expect, test } from '@playwright/test';

const apiBaseUrl = process.env.PREVIEW_API_URL;

test('trip members open in a dedicated settings page and remain editable', async ({ page, request }) => {
  test.skip(!apiBaseUrl, 'PREVIEW_API_URL is required for deployed-preview smoke testing');
  test.setTimeout(60_000);
  page.setDefaultTimeout(10_000);

  const create = await request.post(`${apiBaseUrl}/itineraries`, {
    data: {
      title: `旅行メンバー設定確認-${Date.now()}`,
      password: `preview-members-${Date.now()}`,
      theme_id: 'standard-spring',
    },
  });
  expect(create.status()).toBe(201);
  const { id, token } = (await create.json()).data as { id: string; token: string };
  expect(token).toBeTruthy();

  try {
    await page.goto(`/itineraries/${id}?token=${encodeURIComponent(token)}`);
    await page.getByRole('button', { name: 'メニュー' }).click();
    await page.getByRole('button', { name: /しおり設定/ }).click();

    const membersButton = page.getByRole('button', { name: '旅行メンバーを編集' });
    await expect(membersButton).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'メンバー名' })).toHaveCount(0);

    await membersButton.click();
    await expect(page.getByRole('heading', { name: '旅行メンバー' })).toBeVisible();
    await page.getByRole('textbox', { name: 'メンバー名' }).fill('テスト参加者');
    await page.getByRole('button', { name: '追加', exact: true }).click();
    await expect(page.locator('.standard-member-row').filter({ hasText: 'テスト参加者' })).toBeVisible();

    // The member editor persists immediately, separately from the settings save button.
    await page.getByRole('button', { name: '設定一覧へ' }).click();
    await expect(page.getByRole('heading', { name: 'しおり設定' })).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'メンバー名' })).toHaveCount(0);
    await membersButton.click();
    const memberRow = page.locator('.standard-member-row').filter({ hasText: 'テスト参加者' });
    await expect(memberRow).toBeVisible();

    await memberRow.getByRole('button', { name: '名前変更' }).click();
    await memberRow.getByRole('textbox', { name: 'テスト参加者の名前' }).fill('変更後の参加者');
    await memberRow.getByRole('button', { name: '保存' }).click();
    const renamedRow = page.locator('.standard-member-row').filter({ hasText: '変更後の参加者' });
    await expect(renamedRow).toBeVisible();

    page.once('dialog', async (dialog) => dialog.accept());
    await renamedRow.getByRole('button', { name: '削除' }).click();
    await expect(page.locator('.standard-member-row')).toHaveCount(0);

    const response = await request.get(`${apiBaseUrl}/itineraries/${id}/members`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(response.ok()).toBeTruthy();
    expect((await response.json()).data).toEqual([]);
  } finally {
    try {
      await request.delete(`${apiBaseUrl}/itineraries/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (error) {
      console.warn(`preview-members-cleanup-failed=${String(error)}`);
    }
  }
});
