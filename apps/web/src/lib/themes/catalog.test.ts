import { describe, expect, it } from 'vitest';
import { getAvailableThemes } from './catalog';

describe('theme catalog', () => {
  it('offers view-based presets', () => {
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
});
