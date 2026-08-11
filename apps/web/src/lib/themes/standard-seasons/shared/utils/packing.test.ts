import { describe, expect, it } from 'vitest';
import { shouldPromptForPackingIdentity } from './packing';

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
});
