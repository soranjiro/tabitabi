import { describe, expect, it } from 'vitest';
import { getAvailableThemes, getThemePreset } from './catalog';

describe('theme catalog', () => {
  it('keeps legacy selector ids stable during the compatibility period', () => {
    expect(getAvailableThemes().map((theme) => theme.id)).toEqual([
      'planning-draft',
      'standard-spring',
      'standard-accordion',
      'standard-summer',
      'standard-autumn',
      'standard-winter',
    ]);
  });

  it('binds each preset to one itinerary view', () => {
    expect(getAvailableThemes().map((theme) => theme.viewMode)).toEqual([
      'list', 'dayCard', 'accordion', 'list', 'week', 'month',
    ]);
  });

  it('resolves canonical preset ids to the same view definitions', () => {
    expect(getThemePreset('planning').id).toBe('planning-draft');
    expect(getThemePreset('day-card').viewMode).toBe('dayCard');
    expect(getThemePreset('accordion').viewMode).toBe('accordion');
    expect(getThemePreset('list').viewMode).toBe('list');
    expect(getThemePreset('week').viewMode).toBe('week');
    expect(getThemePreset('month').viewMode).toBe('month');
  });
});
