import { describe, expect, it } from 'vitest';
import { getAvailableThemes } from './catalog';

describe('theme catalog', () => {
  it('offers only the four standard season themes', () => {
    expect(getAvailableThemes().map((theme) => theme.id)).toEqual([
      'standard-spring',
      'standard-summer',
      'standard-autumn',
      'standard-winter',
    ]);
  });
});
