import { describe, expect, it } from 'vitest';
import { normalizeStepNotes } from './step';

describe('normalizeStepNotes', () => {
  it('wraps plain text as memo JSON for the steps API', () => {
    expect(normalizeStepNotes('午後に散歩したい')).toBe('{"text":"午後に散歩したい"}');
  });

  it('keeps existing JSON notes unchanged', () => {
    const notes = '{"text":"既存メモ","showRoute":false}';
    expect(normalizeStepNotes(notes)).toBe(notes);
  });

  it('leaves omitted notes undefined so the API default is used', () => {
    expect(normalizeStepNotes(undefined)).toBeUndefined();
  });
});
