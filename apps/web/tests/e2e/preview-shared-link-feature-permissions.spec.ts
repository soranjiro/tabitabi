import { expect, test } from '@playwright/test';

const apiBaseUrl = process.env.PREVIEW_API_URL;

// A /s/:id link is read-only for the itinerary, but money/packing edits must
// independently respect their per-feature opt-in switches.
for (const themeId of ['standard-spring', 'planning-draft']) {
  test(`shared view link honors money and packing edit opt-in (${themeId})`, async ({ page, request }) => {
    test.skip(!apiBaseUrl, 'PREVIEW_API_URL is required for deployed-preview smoke testing');
    test.setTimeout(90_000);

    const create = await request.post(`${apiBaseUrl}/itineraries`, {
      data: { title: `共有権限確認-${themeId}-${Date.now()}`, theme_id: themeId },
    });
    expect(create.status()).toBe(201);
    const { id, token } = (await create.json()).data as { id: string; token?: string };
    const root = `${apiBaseUrl}/itineraries/${id}`;

    try {
      const addMember = await request.post(`${root}/money/members`, { data: { name: '検証メンバー' } });
      expect(addMember.status()).toBe(201);

      // ON (default): the view link must not show editing affordances.
      await page.goto(`/s/${id}#money`);
      await expect(page.getByRole('heading', { name: 'お金の管理' })).toBeVisible();
      // A #money deep link intentionally opens the settlement summary first.
      await page.getByRole('tab', { name: '立て替え' }).click();
      await expect(page.getByRole('button', { name: /立て替えを登録/ })).toHaveCount(0);

      // OFF: a viewer without a password or edit token can actually submit an expense.
      const moneyOff = await request.put(`${root}/money/permissions`, {
        data: { requires_edit_permission: false },
      });
      expect(moneyOff.ok()).toBeTruthy();
      await page.reload();
      await page.getByRole('tab', { name: '立て替え' }).click();
      const addExpense = page.getByRole('button', { name: /立て替えを登録/ });
      await expect(addExpense).toBeVisible();
      await addExpense.click();
      await page.getByLabel('支出の内容').fill('共有リンクからの支出');
      await page.getByLabel('総額（円）').fill('1500');
      await page.getByRole('button', { name: '登録する', exact: true }).click();
      await expect.poll(async () => {
        const r = await request.get(`${root}/money`);
        return (await r.json()).data.items.some((item: { title: string }) => item.title === '共有リンクからの支出');
      }).toBe(true);

      // Switching back ON immediately removes the viewer's editing affordances.
      const moneyOn = await request.put(`${root}/money/permissions`, {
        data: { requires_edit_permission: true },
      });
      expect(moneyOn.ok()).toBeTruthy();
      await page.reload();
      await page.getByRole('tab', { name: '立て替え' }).click();
      await expect(page.getByRole('button', { name: /立て替えを登録/ })).toHaveCount(0);

      const packingOff = await request.put(`${root}/packing/permissions`, {
        data: { requires_edit_permission: false },
      });
      expect(packingOff.ok()).toBeTruthy();
      await page.goto(`/s/${id}#packing`);
      const addPacking = page.getByRole('button', { name: /持ち物を追加/ });
      await expect(addPacking).toBeVisible();
      await addPacking.click();
      await page.getByPlaceholder('例：トップス').fill('共有リンクからの持ち物');
      await page.getByRole('button', { name: '保存', exact: true }).click();
      await expect.poll(async () => {
        const r = await request.get(`${root}/packing`);
        return (await r.json()).data.items.some((item: { name: string }) => item.name === '共有リンクからの持ち物');
      }).toBe(true);

      const packingOn = await request.put(`${root}/packing/permissions`, {
        data: { requires_edit_permission: true },
      });
      expect(packingOn.ok()).toBeTruthy();
      await page.reload();
      await expect(page.getByRole('button', { name: /持ち物を追加/ })).toHaveCount(0);
    } finally {
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
      const removal = await request.delete(root, { headers });
      if (!removal.ok()) console.warn(`preview-shared-permissions-cleanup-failed=${id}:${removal.status()}`);
    }
  });
}
