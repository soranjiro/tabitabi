import { describe, expect, it } from 'vitest';
import type { PackingGroup } from '@tabitabi/types';
import { movePackingGroup, orderPackingGroups, shouldPromptForPackingIdentity } from './packing';

const group = (id: string, sort_order: number, created_at = '2026-08-01T00:00:00.000Z'): PackingGroup => ({
  id, itinerary_id: 'trip-1', name: id, sort_order, created_at, updated_at: created_at,
});

describe('shouldPromptForPackingIdentity', () => {
  it('does not block the empty state when no trip members exist', () => {
    expect(shouldPromptForPackingIdentity(0, '')).toBe(false);
  });

  it('prompts when members exist but this device has no selection', () => {
    expect(shouldPromptForPackingIdentity(2, '')).toBe(true);
  });

  it('does not prompt after a member has been selected', () => {
    expect(shouldPromptForPackingIdentity(2, 'member-1')).toBe(false);
  });

  it('orders packing groups by their persisted order', () => {
    expect(orderPackingGroups([group('clothes', 2), group('valuables', 0), group('devices', 1)]).map(({ id }) => id))
      .toEqual(['valuables', 'devices', 'clothes']);
  });

  it('moves a group and normalizes the order used by checklists', () => {
    const moved = movePackingGroup([group('valuables', 0), group('devices', 1), group('clothes', 2)], 'clothes', 0);
    expect(moved.map(({ id, sort_order }) => [id, sort_order])).toEqual([
      ['clothes', 0],
      ['valuables', 1],
      ['devices', 2],
    ]);
  });
});
