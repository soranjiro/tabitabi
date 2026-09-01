import { expect, test } from '@playwright/test';

const apiBaseUrl = process.env.PREVIEW_API_URL;

test('deployed preview can save a home hero background from itinerary settings', async ({ page, request }) => {
  test.skip(!apiBaseUrl, 'PREVIEW_API_URL is required for deployed-preview smoke testing');
  test.setTimeout(60_000);
  page.setDefaultTimeout(10_000);

  const title = `背景Preview確認-${Date.now()}`;
  const password = `preview-${Date.now()}`;
  console.log('preview-background-step=create-itinerary');
  const createResponse = await request.post(`${apiBaseUrl}/itineraries`, {
    data: {
      title,
      password,
      theme_id: 'standard-spring',
      palette_id: 'sakura',
    },
  });
  expect(createResponse.ok()).toBeTruthy();

  const createBody = await createResponse.json();
  const itineraryId = createBody.data.id as string;
  const editToken = createBody.data.token as string;
  expect(editToken).toBeTruthy();

  try {
    console.log('preview-background-step=open-itinerary-with-edit-token');
    await page.goto(`/itineraries/${itineraryId}?token=${encodeURIComponent(editToken)}`);
    await expect(page.getByRole('button', { name: title })).toBeVisible();

    const dismissMetadata = page.getByRole('button', { name: '今はしない' });
    if (await dismissMetadata.isVisible().catch(() => false)) {
      console.log('preview-background-step=dismiss-metadata-onboarding');
      await dismissMetadata.click();
    }

    console.log('preview-background-step=verify-edit-permission');
    await expect(page.getByRole('button', { name: '＋ 予定を追加' })).toBeVisible();

    console.log('preview-background-step=open-settings');
    await page.getByRole('button', { name: 'メニュー' }).click();
    await page.getByRole('button', { name: /しおり設定/ }).click();
    await expect(page.getByRole('heading', { name: 'しおり設定' })).toBeVisible();
    await expect(page.getByRole('button', { name: '保存' })).toBeEnabled();

    console.log('preview-background-step=choose-home-winter-background');
    await page.getByRole('heading', { name: '背景画像' }).click();
    const winterOption = page.locator('label.standard-background-option').filter({ hasText: 'トップ画像・冬' });
    await expect(winterOption).toBeVisible();
    await winterOption.click();
    await expect(winterOption.locator('input[type="radio"]')).toBeChecked();
    await page.screenshot({ path: 'test-results/background-settings-selected.png', fullPage: false });

    console.log('preview-background-step=save-background');
    const saveResponsePromise = page.waitForResponse((response) =>
      response.url().includes(`/api/v1/backgrounds/${itineraryId}`)
      && response.request().method() === 'PUT',
    );
    await page.getByRole('button', { name: '保存' }).click();
    const saveResponse = await saveResponsePromise;
    expect(saveResponse.status()).toBe(200);
    await expect(page.getByRole('heading', { name: 'しおり設定' })).toBeHidden();

    console.log('preview-background-step=verify-api-persistence');
    const readResponse = await request.get(`${apiBaseUrl}/backgrounds/${itineraryId}`, {
      headers: { Authorization: `Bearer ${editToken}` },
    });
    expect(readResponse.ok()).toBeTruthy();
    const readBody = await readResponse.json();
    expect(readBody.data.background_image).toBe('/hero/background-winter.avif');

    console.log('preview-background-step=verify-live-cover');
    await expect.poll(async () => page.locator('html').evaluate((element) =>
      getComputedStyle(element).getPropertyValue('--itinerary-cover-image'),
    )).toContain('background-winter.avif');
    await page.screenshot({ path: 'test-results/background-cover-saved.png', fullPage: false });

    console.log('preview-background-step=reload-and-verify-cover');
    await page.reload();
    await expect.poll(async () => page.locator('html').evaluate((element) =>
      getComputedStyle(element).getPropertyValue('--itinerary-cover-image'),
    )).toContain('background-winter.avif');
    await page.screenshot({ path: 'test-results/background-cover-reloaded.png', fullPage: false });
    console.log('preview-background-step=complete');
  } finally {
    try {
      await request.delete(`${apiBaseUrl}/itineraries/${itineraryId}`, {
        headers: { Authorization: `Bearer ${editToken}` },
      });
    } catch (error) {
      console.warn(`preview-background-cleanup-failed=${String(error)}`);
    }
  }
});
