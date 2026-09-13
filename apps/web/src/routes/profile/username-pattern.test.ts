import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('./+page.svelte', import.meta.url), 'utf8');

describe('profile username pattern', () => {
  it('binds the Unicode username pattern instead of embedding property escapes in Svelte markup', () => {
    expect(source).toContain('const usernamePattern = "[\\\\p{L}\\\\p{N}\\\\p{M}_]+";');
    expect(source.match(/pattern=\{usernamePattern\}/g)).toHaveLength(3);
    expect(source).not.toContain('pattern="[\\\\p{L}');
  });
});
