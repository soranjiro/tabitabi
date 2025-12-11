import { test, expect } from '@playwright/test';

const stubGeoResponse = {
  type: 'FeatureCollection',
  query: ['tokyo'],
  features: [
    {
      id: 'place.1',
      type: 'Feature',
      text: 'Tokyo Tower',
      place_name: 'Tokyo Tower, Minato City',
      center: [139.7454, 35.6586],
    },
    {
      id: 'place.2',
      type: 'Feature',
      text: 'Shibuya Station',
      place_name: 'Shibuya Station, Tokyo',
      center: [139.7013, 35.658],
    },
  ],
};

test.describe('mapbox-journey theme', () => {
  test('suggests locations and toggles pixel style', async ({ page }) => {
    await page.route('**/geocoding/v5/mapbox.places/**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(stubGeoResponse),
      });
    });

    await page.goto('/demo?theme=mapbox-journey&token=test-token');

    await page.waitForSelector('.journey-container');
    await page.getByRole('button', { name: 'スポット追加' }).click();

    const titleInput = page.getByLabel('タイトル *');
    await titleInput.fill('Playwright Spot');

    const locationInput = page.getByLabel('場所');
    await locationInput.fill('tokyo');

    const firstSuggestion = page.locator('.suggestion').first();
    const suggestionText = await firstSuggestion.locator('.suggestion-context').innerText();
    await expect(firstSuggestion).toBeVisible();
    await firstSuggestion.click();
    await expect(locationInput).toHaveValue(suggestionText, { timeout: 10000 });

    await page.getByRole('button', { name: 'スポットを追加', exact: true }).click();
    await expect(page.locator('.form-modal')).toBeHidden();

    await page.getByLabel('設定パネルを開閉').click();
    const pixelButton = page.getByRole('button', { name: '🕹️ ピクセル' });
    await pixelButton.click();
    await expect(pixelButton).toHaveClass(/active/);
  });
});
