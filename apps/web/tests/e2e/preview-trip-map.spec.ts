import { expect, test } from '@playwright/test';

const apiBaseUrl = process.env.PREVIEW_API_URL;

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

  try {
    await page.goto(`/itineraries/${itineraryId}?token=${encodeURIComponent(editToken)}`);
    await expect(page.getByText('旅先マップ', { exact: true })).toBeVisible();
    await expect(page.getByText(title, { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: '浅草寺' })).toBeVisible();

    await expect(page.locator('.maplibregl-canvas')).toBeVisible({ timeout: 30_000 });
    await page.screenshot({ path: 'test-results/trip-map-mobile-initial.png', fullPage: false });

    const map = page.getByLabel('旅行候補マップ');
    await map.click({ position: { x: 170, y: 250 } });
    await expect(page.getByRole('dialog', { name: '候補を追加' })).toBeVisible();
    await page.getByLabel('場所の名前').fill('上野公園');
    await page.getByLabel('メモ').fill('午後に散歩したい');
    await page.getByRole('button', { name: '候補に保存' }).click();

    const uenoCard = page.locator('.candidate-card').filter({ hasText: '上野公園' });
    await expect(uenoCard).toBeVisible();
    await page.screenshot({ path: 'test-results/trip-map-mobile-candidate.png', fullPage: false });

    await uenoCard.getByRole('button', { name: '予定に追加' }).click();
    await expect(page.getByRole('dialog', { name: '予定に追加' })).toBeVisible();
    await page.getByRole('button', { name: 'この予定で追加' }).click();

    await expect(page.locator('.schedule-row').filter({ hasText: '上野公園' })).toBeVisible();
    await expect(page.getByRole('button', { name: /予定/ })).toHaveClass(/active/);
    await page.screenshot({ path: 'test-results/trip-map-mobile-scheduled.png', fullPage: false });
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
