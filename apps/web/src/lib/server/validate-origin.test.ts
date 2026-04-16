import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockEnv } = vi.hoisted(() => {
  const mockEnv: Record<string, string | undefined> = {};
  return { mockEnv };
});

vi.mock('$app/environment', () => ({ dev: false }));
vi.mock('$env/dynamic/private', () => ({ env: mockEnv }));

import { validateOrigin } from './validate-origin';

function createRequest(headers: Record<string, string> = {}): Request {
  return new Request('https://example.com/api/token', { headers });
}

describe('validateOrigin', () => {
  beforeEach(() => {
    for (const key of Object.keys(mockEnv)) {
      delete mockEnv[key];
    }
  });

  it('rejects requests with no Origin or Referer', () => {
    const req = createRequest({ host: 'example.com' });
    expect(() => validateOrigin(req)).toThrow();
  });

  it('allows requests with matching Origin (self-origin fallback)', () => {
    const req = createRequest({
      origin: 'https://example.com',
      host: 'example.com',
    });
    expect(() => validateOrigin(req)).not.toThrow();
  });

  it('rejects requests with mismatched Origin (self-origin fallback)', () => {
    const req = createRequest({
      origin: 'https://evil.com',
      host: 'example.com',
    });
    expect(() => validateOrigin(req)).toThrow();
  });

  it('allows requests with matching Referer when no Origin', () => {
    const req = createRequest({
      referer: 'https://example.com/page',
      host: 'example.com',
    });
    expect(() => validateOrigin(req)).not.toThrow();
  });

  it('rejects requests with mismatched Referer', () => {
    const req = createRequest({
      referer: 'https://evil.com/page',
      host: 'example.com',
    });
    expect(() => validateOrigin(req)).toThrow();
  });

  describe('ALLOWED_ORIGINS', () => {
    it('allows origins in the allowlist', () => {
      mockEnv.ALLOWED_ORIGINS = 'https://app.example.com, https://staging.example.com';
      const req = createRequest({
        origin: 'https://app.example.com',
        host: 'example.com',
      });
      expect(() => validateOrigin(req)).not.toThrow();
    });

    it('rejects origins not in the allowlist', () => {
      mockEnv.ALLOWED_ORIGINS = 'https://app.example.com';
      const req = createRequest({
        origin: 'https://evil.com',
        host: 'example.com',
      });
      expect(() => validateOrigin(req)).toThrow();
    });
  });

  it('uses x-forwarded-proto for self-origin comparison', () => {
    const req = createRequest({
      origin: 'http://example.com',
      host: 'example.com',
      'x-forwarded-proto': 'http',
    });
    expect(() => validateOrigin(req)).not.toThrow();
  });

  it('rejects when host header is missing and no ALLOWED_ORIGINS', () => {
    const req = createRequest({
      origin: 'https://example.com',
    });
    expect(() => validateOrigin(req)).toThrow();
  });
});
