import { env } from 'cloudflare:test';
import { afterEach, describe, expect, it, vi } from 'vitest';
import app from '../src/index';

describe('CORS request logging', () => {
  afterEach(() => vi.restoreAllMocks());

  it('does not write application logs for normal requests or preflight', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const response = await app.request('/health', {
      headers: { Origin: 'https://tabitabi.pages.dev' },
    }, env);
    expect(response.status).toBe(200);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');

    const preflight = await app.request('/api/v1/itineraries', {
      method: 'OPTIONS',
      headers: { Origin: 'https://tabitabi.pages.dev' },
    }, env);
    expect(preflight.status).toBe(204);
    expect(log).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });

  it('still warns when a cross-origin preflight is blocked', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const restrictedEnv = { ...env, ALLOWED_ORIGINS: 'https://tabitabi.pages.dev' };

    const response = await app.request('/health', {
      method: 'OPTIONS',
      headers: { Origin: 'https://untrusted.example' },
    }, restrictedEnv);

    expect(response.status).toBe(403);
    expect(warn).toHaveBeenCalledOnce();
    expect(warn).toHaveBeenCalledWith(
      '[CORS_BLOCK]',
      expect.stringContaining('"origin":"https://untrusted.example"'),
    );
    expect(log).not.toHaveBeenCalled();
  });
});
