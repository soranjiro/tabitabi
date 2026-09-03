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

    console.log('preview-background-step=verify-metadata-onboarding-is-disabled');
    await expect(page.getByRole('button', { name: '今はしない' })).toBeHidden();

    console.log('preview-background-step=verify-edit-permission');
    await expect(page.getByRole('button', { name: '＋ 予定を追加' })).toBeVisible();

    console.log('preview-background-step=open-settings');
    await page.getByRole('button', { name: 'メニュー' }).click();
    await page.getByRole('button', { name: /しおり設定/ }).click();
    await expect(page.getByRole('heading', { name: 'しおり設定' })).toBeVisible();
    await expect(page.getByRole('button', { name: '保存' })).toBeEnabled();

    console.log('preview-background-step=open-background-picker');
    await page.getByRole('button', { name: '背景を選ぶ' }).click();
    await expect(page.getByRole('heading', { name: '背景画像' }).last()).toBeVisible();

    console.log('preview-background-step=choose-page-background');
    const winterOption = page.locator('label.standard-background-option').filter({ hasText: 'トップ画像・冬' });
    await winterOption.click();
    await page.locator('label.standard-settings-page-radio').filter({ hasText: 'しおり全体の背景' }).click();
    await expect(winterOption.locator('input[type="radio"]')).toBeChecked();
    await page.getByRole('button', { name: /戻る/ }).last().click();
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
    expect(readBody.data.background_display).toBe('page');

    console.log('preview-background-step=verify-live-cover');
    await expect.poll(async () => page.locator('html').evaluate((element) =>
      getComputedStyle(element).getPropertyValue('--itinerary-cover-image'),
    )).toBe('');
    await expect.poll(async () => page.locator('html').evaluate((element) =>
      getComputedStyle(element).getPropertyValue('--itinerary-page-background-image'),
    )).toContain('background-winter.avif');
    await expect.poll(async () => page.locator('.standard-theme').evaluate((element) =>
      getComputedStyle(element).backgroundImage,
    )).toContain('background-winter.avif');
    await page.screenshot({ path: 'test-results/background-cover-saved.png', fullPage: false });

    console.log('preview-background-step=reload-and-verify-page-background');
    await page.reload();
    await expect.poll(async () => page.locator('html').evaluate((element) =>
      getComputedStyle(element).getPropertyValue('--itinerary-page-background-image'),
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

test('deployed preview supports mobile trip-map candidate planning', async ({ page, request }) => {
  test.skip(!apiBaseUrl, 'PREVIEW_API_URL is required for deployed-preview smoke testing');
  test.setTimeout(90_000);
  page.setDefaultTimeout(15_000);
  await page.setViewportSize({ width: 390, height: 844 });

  const title = `旅先マップPreview-${Date.now()}`;
  const password = `preview-${Date.now()}`;
  const initialCandidate = {
    id: 'preview-asakusa',
    title: '浅草寺',
    lat: 35.714765,
    lng: 139.796655,
    category: 'sightseeing',
    notes: '朝のうちに行きたい',
    createdAt: new Date().toISOString(),
  };

  const createResponse = await request.post(`${apiBaseUrl}/itineraries`, {
    data: {
      title,
      password,
      theme_id: 'map-only',
      palette_id: 'neutral',
      memo: JSON.stringify({ text: '', mapCandidates: [initialCandidate] }),
    },
  });
  expect(createResponse.ok()).toBeTruthy();

  const createBody = await createResponse.json();
  const itineraryId = createBody.data.id as string;
  const editToken = createBody.data.token as string;
  expect(editToken).toBeTruthy();

  try {
    console.log('preview-trip-map-step=open-mobile-itinerary');
    await page.goto(`/itineraries/${itineraryId}?token=${encodeURIComponent(editToken)}`);
    await expect(page.getByText('旅先マップ', { exact: true })).toBeVisible();
    await expect(page.getByText(title, { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: '浅草寺' })).toBeVisible();

    console.log('preview-trip-map-step=verify-map');
    const mapCanvas = page.locator('.maplibregl-canvas');
    await expect(mapCanvas).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole('button', { name: '浅草寺' })).toBeVisible({ timeout: 30_000 });
    await page.screenshot({ path: 'test-results/trip-map-mobile-initial.png', fullPage: false });

    console.log('preview-trip-map-step=add-candidate');
    await mapCanvas.click({ position: { x: 56, y: 300 } });
    await expect(page.getByRole('dialog', { name: '候補を追加' })).toBeVisible({ timeout: 10_000 });
    await page.getByLabel('場所の名前').fill('上野公園');
    await page.getByLabel('メモ').fill('午後に散歩したい');
    await page.getByRole('button', { name: '候補に保存' }).click();

    const uenoCard = page.locator('.candidate-card').filter({ hasText: '上野公園' });
    await expect(uenoCard).toBeVisible();
    await page.screenshot({ path: 'test-results/trip-map-mobile-candidate.png', fullPage: false });

    console.log('preview-trip-map-step=schedule-candidate');
    await uenoCard.getByRole('button', { name: '予定に追加' }).click();
    await expect(page.getByRole('dialog', { name: '予定に追加' })).toBeVisible();
    await page.getByRole('button', { name: 'この予定で追加' }).click();

    await expect(page.locator('.schedule-row').filter({ hasText: '上野公園' })).toBeVisible();
    await expect(page.getByRole('button', { name: /予定/ })).toHaveClass(/active/);
    await page.screenshot({ path: 'test-results/trip-map-mobile-scheduled.png', fullPage: false });
    console.log('preview-trip-map-step=complete');
  } finally {
    try {
      await request.delete(`${apiBaseUrl}/itineraries/${itineraryId}`, {
        headers: { Authorization: `Bearer ${editToken}` },
      });
    } catch (error) {
      console.warn(`preview-trip-map-cleanup-failed=${String(error)}`);
    }
  }
});
