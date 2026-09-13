import { describe, expect, it } from 'vitest';
import { renderMarkdown } from './markdown';

describe('ai-generated markdown security', () => {
  it('removes javascript URLs from markdown links', () => {
    const html = renderMarkdown('[open](javascript:alert(1))');
    expect(html).not.toContain('javascript:');
    expect(html).not.toContain('alert(1)');
  });

  it('does not allow HTML event handlers from notes', () => {
    const html = renderMarkdown('<img src=x onerror="alert(1)">');
    expect(html).not.toContain('<img');
    expect(html).not.toContain('onerror');
  });

  it('keeps normal HTTPS links', () => {
    const html = renderMarkdown('[open](https://example.com/path)');
    expect(html).toContain('href="https://example.com/path"');
  });
});
