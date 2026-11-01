import { describe, expect, it } from 'vitest';
import { sanitizeMemoText, updateMemoText } from './index';
import { renderMarkdown } from '../themes/standard/core/utils/markdown';

describe('memo source and safe rendering', () => {
  it('preserves harmless markdown and original note text', () => {
    const input = '予約: **OK** <angle brackets> javascript: is just text';
    expect(sanitizeMemoText(input)).toBe(input);
    expect(updateMemoText(null, input)).toBe(input);
  });

  it('handles nested script attempts without executing markup', () => {
    const input = '<scrip<script>alert(1)</script>t>alert(2)</script>';
    expect(renderMarkdown(updateMemoText(null, input))).not.toContain('<script');
    expect(renderMarkdown(input)).not.toContain('onerror=');
  });

  it('prevents executable markdown links', () => {
    expect(renderMarkdown('[click](javascript:alert(1))')).not.toContain('href="javascript:');
  });
});
