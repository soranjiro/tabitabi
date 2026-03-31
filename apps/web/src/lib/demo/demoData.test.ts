import { describe, it, expect, vi } from 'vitest';
import { getDemoData } from './demoData';

describe('Demo Data Lazy Loading', () => {
  it('should load standard-autumn demo data', async () => {
    const data = await getDemoData('standard-autumn');

    expect(data.itinerary).toBeDefined();
    expect(data.itinerary.title).toBe('京都紅葉旅行');
    expect(data.itinerary.theme_id).toBe('standard-autumn');
    expect(data.steps.length).toBeGreaterThan(0);
    expect(data.steps[0].title).toBe('清水寺');
  });

  it('should load shopping demo data', async () => {
    const data = await getDemoData('shopping');

    expect(data.itinerary).toBeDefined();
    expect(data.itinerary.title).toBe('週末の買い物リスト');
    expect(data.itinerary.theme_id).toBe('shopping');
    expect(data.steps.length).toBe(4);
    expect(data.steps[0].title).toBe('牛乳');
  });

  it('should load pixel-quest demo data', async () => {
    const data = await getDemoData('pixel-quest');

    expect(data.itinerary).toBeDefined();
    expect(data.itinerary.title).toBe('日本征服');
    expect(data.itinerary.theme_id).toBe('pixel-quest');
    expect(data.steps.length).toBe(4);
    expect(data.steps[0].title).toBe('出発の儀');
  });

  it('should load ai-generated demo data', async () => {
    const data = await getDemoData('ai-generated');

    expect(data.itinerary).toBeDefined();
    expect(data.itinerary.title).toBe('沖縄リゾート');
    expect(data.itinerary.theme_id).toBe('ai-generated');
    expect(data.steps.length).toBe(5);
    expect(data.itinerary_secrets).toBeDefined();
    expect(data.itinerary_secrets?.enabled).toBe(true);
  });

  it('should load map-only demo data', async () => {
    const data = await getDemoData('map-only');

    expect(data.itinerary).toBeDefined();
    expect(data.itinerary.title).toBe('東京ガイドツアー');
    expect(data.itinerary.theme_id).toBe('map-only');
    expect(data.steps.length).toBe(6);
    expect(data.steps[0].title).toBe('浅草寺');
  });

  it('should load mapbox-journey demo data', async () => {
    const data = await getDemoData('mapbox-journey');

    expect(data.itinerary).toBeDefined();
    expect(data.itinerary.title).toBe('世界の夜景フライト');
    expect(data.itinerary.theme_id).toBe('mapbox-journey');
    expect(data.steps.length).toBe(6);
    expect(data.steps[0].title).toBe('羽田を離陸');
  });

  it('should load sauna-rally demo data', async () => {
    const data = await getDemoData('sauna-rally');

    expect(data.itinerary).toBeDefined();
    expect(data.itinerary.title).toBe('東京サウナ巡り');
    expect(data.itinerary.theme_id).toBe('sauna-rally');
    expect(data.steps.length).toBe(3);
    expect(data.steps[0].title).toBe('サウナ&ホテル かるまる池袋');
  });

  it('should return default theme data for invalid theme', async () => {
    const data = await getDemoData('invalid-theme');

    expect(data).toBeDefined();
    expect(data.itinerary.theme_id).toBe('standard-autumn');
  });

  it('should cache loaded demo data', async () => {
    const data1 = await getDemoData('standard-autumn');
    const data2 = await getDemoData('standard-autumn');

    expect(data1).toBe(data2);
  });

  it('should load all available themes', async () => {
    const themes = [
      'map-only',
      'mapbox-journey',
      'standard-autumn',
      'ai-generated',
      'shopping',
      'pixel-quest',
      'sauna-rally',
    ];

    for (const theme of themes) {
      const data = await getDemoData(theme);
      expect(data.itinerary).toBeDefined();
      expect(data.steps.length).toBeGreaterThan(0);
      expect(data.itinerary.theme_id).toBe(theme);
    }
  });
});
