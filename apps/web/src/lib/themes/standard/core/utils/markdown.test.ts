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

  it('allows safe HTML elements', () => {
    const result = renderMarkdown('# Heading\n\n- item1\n- item2');
    expect(result).toContain('<h1>');
    expect(result).toContain('<li>');
  });
});
