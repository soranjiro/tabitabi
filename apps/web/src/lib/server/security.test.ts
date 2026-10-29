import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { hasUnsafeLeadingDoubleSlash, resolveContainedHtmlPath } from './security';

describe('request path hardening', () => {
  it('rejects protocol-relative-style pathnames', () => {
    expect(hasUnsafeLeadingDoubleSlash('//evil.example/path')).toBe(true);
    expect(hasUnsafeLeadingDoubleSlash('/docs/getting-started')).toBe(false);
  });
});

describe('documentation path containment', () => {
  const docsRoot = path.resolve('/tmp/tabitabi-docs');

  it('resolves nested documentation pages inside the docs root', () => {
    expect(resolveContainedHtmlPath(docsRoot, 'guide/getting-started')).toBe(
      path.resolve(docsRoot, 'guide/getting-started.html'),
    );
  });

  it.each([
    '../secret',
    'guide/../../secret',
    '/absolute',
    '..\\secret',
    'guide\\..\\secret',
    'guide//secret',
    '.',
    '..',
  ])('rejects unsafe path %s', (candidate) => {
    expect(resolveContainedHtmlPath(docsRoot, candidate)).toBeNull();
  });
});
