import { expect, test } from '@playwright/test';

const apiBaseUrl = process.env.PREVIEW_API_URL;

test('deployed preview can save a home hero background from itinerary settings', async ({ page, request }) => {
  test.skip(!apiBaseUrl, 'PREVIEW_API_URL is required for deployed-preview smoke testing');

  const title = `背景Preview確認-${Date.now()}`;
  const createResponse = await request.post(`${apiBaseUrl}/itineraries`, {
    data: {
      title,
      theme_id: 'standard-spring',
      palette_id: 'sakura',
    },
  });
  expect(createResponse.ok()).toBeTruthy();

  const createBody = await createResponse.json();
  const itineraryId = createBody.data.id as string;

  try {
    await page.goto(`/itineraries/${itineraryId}`);
    await expect(page.getByRole('button', { name: title })).toBeVisible();

    await page.getByRole('button', { name: 'メニュー' }).click();
    await page.getByRole('button', { name: /しおり設定/ }).click();
    await expect(page.getByRole('heading', { name: 'しおり設定' })).toBeVisible();

    await page.getByRole('heading', { name: '背景画像' }).click();
    const winterOption = page.locator('label.standard-background-option').filter({ hasText: 'トップ画像・冬' });
    await expect(winterOption).toBeVisible();
    await winterOption.click();

    const saveResponsePromise = page.waitForResponse((response) =>
      response.url().includes(`/api/v1/backgrounds/${itineraryId}`)
      && response.request().method() === 'PUT',
    );
    await page.getByRole('button', { name: '保存' }).click();
    const saveResponse = await saveResponsePromise;
    expect(saveResponse.status()).toBe(200);

    await expect(page.getByRole('heading', { name: 'しおり設定' })).toBeHidden();

    const readResponse = await request.get(`${apiBaseUrl}/backgrounds/${itineraryId}`);
    expect(readResponse.ok()).toBeTruthy();
    const readBody = await readResponse.json();
    expect(readBody.data.background_image).toBe('/hero/background-winter.avif');

    await page.reload();
    await expect.poll(async () => page.locator('html').evaluate((element) =>
      getComputedStyle(element).getPropertyValue('--itinerary-cover-image'),
    )).toContain('background-winter.avif');
  } finally {
    await request.delete(`${apiBaseUrl}/itineraries/${itineraryId}`);
  }
});
