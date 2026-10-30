import { describe, it, expect } from 'vitest';
import { renderMarkdown } from './markdown';

describe('renderMarkdown', () => {
  it('renders basic markdown', () => {
    const result = renderMarkdown('**bold** text');
    expect(result).toContain('<strong>bold</strong>');
    expect(result).toContain('text');
  });

  it('returns empty string for null/undefined', () => {
    expect(renderMarkdown(null)).toBe('');
    expect(renderMarkdown(undefined)).toBe('');
  });

  it('strips <script> tags', () => {
    const result = renderMarkdown('<script>alert(1)</script>');
    expect(result).not.toContain('<script>');
    expect(result).not.toContain('alert(1)');
  });

  it('strips onerror event handlers', () => {
    const result = renderMarkdown('<img src=x onerror=alert(1)>');
    expect(result).not.toContain('onerror');
  });

  it('strips iframe tags', () => {
    const result = renderMarkdown('<iframe src=https://evil.com></iframe>');
    expect(result).not.toContain('<iframe');
  });

  it('strips javascript: URLs in links', () => {
    const result = renderMarkdown('[click](javascript:alert(1))');
    expect(result).not.toContain('javascript:');
  });

  it('rejects entity-encoded executable URLs', () => {
    const html = renderMarkdown('<a href="&#x6a;avascript:alert(1)">bad</a>');
    expect(html).not.toMatch(/href=["']\\s*javascript:/i);
  });

  it('drops dangerous SVG and event handlers', () => {
    const html = renderMarkdown('<svg onload=alert(1)><a href="javascript:alert(2)">bad</a></svg>');
    expect(html).not.toContain('<svg');
    expect(html).not.toContain('onload=');
    expect(html).not.toContain('javascript:');
  });

  it('preserves safe links and checkbox markup', () => {
    const html = renderMarkdown('[site](https://example.com/path)\\n\\n- [x] Done');
    expect(html).toContain('href="https://example.com/path"');
    expect(html).toContain('type="checkbox"');
  });

  it('allows safe HTML elements', () => {
    const result = renderMarkdown('# Heading\n\n- item1\n- item2');
    expect(result).toContain('<h1>');
    expect(result).toContain('<li>');
  });
});
