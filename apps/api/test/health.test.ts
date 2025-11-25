import {
  env,
  createExecutionContext,
  waitOnExecutionContext,
} from 'cloudflare:test';
import { describe, it, expect, beforeEach } from 'vitest';
import app from '../src/index';

describe('Health Check', () => {
  it('returns OK', async () => {
    const request = new Request('http://localhost/health');
    const ctx = createExecutionContext();
    const response = await app.fetch(request, env, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual({ status: 'ok', service: 'tabitabi-api' });
  });
});
