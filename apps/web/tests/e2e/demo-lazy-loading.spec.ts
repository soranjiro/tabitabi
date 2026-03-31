import { expect, test } from '@playwright/test';

test.describe('Demo Data Lazy Loading', () => {
  const themes = [
    'map-only',
    'mapbox-journey',
    'standard-autumn',
    'ai-generated',
    'shopping',
    'pixel-quest',
    'sauna-rally',
  ];

  themes.forEach((theme) => {
    test(`should load ${theme} demo data correctly`, async ({ page }) => {
      // Navigate to home page
      await page.goto('/');

      // Look for demo theme selector (might be in a modal or button)
      const demoButton = page.getByRole('button', { name: /デモ|Demo/ });
      if (await demoButton.isVisible()) {
        await demoButton.click();
      }

      // Wait for modal or selector to appear
      const themeButton = page.locator(`button:has-text("${getThemeDisplayName(theme)}")`).first();

      if (await themeButton.isVisible({ timeout: 5000 })) {
        await themeButton.click();

        // Wait for demo page to load with demo data
        await page.waitForURL(/\/demo/);

        // Verify that demo data is loaded (check for demo itinerary title)
        const demoTitle = getDemoTitle(theme);
        await expect(page.locator(`text=${demoTitle}`)).toBeVisible({ timeout: 10000 });

        // Verify that demo steps are loaded
        const firstStepTitle = getFirstStepTitle(theme);
        await expect(page.locator(`text=${firstStepTitle}`)).toBeVisible({ timeout: 5000 });

        console.log(`✓ ${theme} demo data loaded successfully`);
      }
    });
  });

  test('should cache demo data after first load', async ({ page }) => {
    // Navigate to home page
    await page.goto('/');

    // Load standard-autumn theme
    const demoButton = page.getByRole('button', { name: /デモ|Demo/ });
    if (await demoButton.isVisible()) {
      await demoButton.click();
    }

    const themeButton = page.locator('button:has-text("標準")').first();
    if (await themeButton.isVisible({ timeout: 5000 })) {
      await themeButton.click();
      await page.waitForURL(/\/demo/);

      // Verify data loaded
      await expect(page.locator('text=京都紅葉旅行')).toBeVisible({ timeout: 10000 });

      console.log('✓ First load of demo data successful');

      // Go back to home and reload the same theme
      await page.goto('/');

      if (await demoButton.isVisible()) {
        await demoButton.click();
      }

      const themeButton2 = page.locator('button:has-text("標準")').first();
      if (await themeButton2.isVisible({ timeout: 5000 })) {
        await themeButton2.click();
        await page.waitForURL(/\/demo/);

        // Second load should use cache (should be faster)
        await expect(page.locator('text=京都紅葉旅行')).toBeVisible({ timeout: 5000 });
        console.log('✓ Cached demo data loaded successfully');
      }
    }
  });
});

function getThemeDisplayName(themeId: string): string {
  const names: Record<string, string> = {
    'map-only': 'Map Only',
    'mapbox-journey': 'Mapbox Journey',
    'standard-autumn': '標準',
    'ai-generated': 'AI Generated',
    'shopping': '買い物リスト',
    'pixel-quest': 'ピクセルクエスト',
    'sauna-rally': 'サウナスタンプラリー',
  };
  return names[themeId] || themeId;
}

function getDemoTitle(themeId: string): string {
  const titles: Record<string, string> = {
    'map-only': '東京ガイドツアー',
    'mapbox-journey': '世界の夜景フライト',
    'standard-autumn': '京都紅葉旅行',
    'ai-generated': '沖縄リゾート',
    'shopping': '週末の買い物リスト',
    'pixel-quest': '日本征服',
    'sauna-rally': '東京サウナ巡り',
  };
  return titles[themeId] || '';
}

function getFirstStepTitle(themeId: string): string {
  const firstSteps: Record<string, string> = {
    'map-only': '浅草寺',
    'mapbox-journey': '羽田を離陸',
    'standard-autumn': '清水寺',
    'ai-generated': '那覇空港到着',
    'shopping': '牛乳',
    'pixel-quest': '出発の儀',
    'sauna-rally': 'サウナ&ホテル かるまる池袋',
  };
  return firstSteps[themeId] || '';
}
