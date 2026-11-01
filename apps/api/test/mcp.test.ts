import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import app from '../src/index';

async function request(path: string, init?: RequestInit) {
  const ctx = createExecutionContext();
  const response = await app.fetch(new Request('http://localhost' + path, init), env, ctx);
  await waitOnExecutionContext(ctx);
  return response;
}

describe('MCP OAuth security and discovery', () => {
  it('advertises the protected resource and PKCE S256', async () => {
    const resource = await request('/.well-known/oauth-protected-resource');
    expect(resource.status).toBe(200);
    expect((await resource.json() as { resource: string }).resource).toBe('http://localhost/mcp');
    const metadata = await request('/.well-known/oauth-authorization-server');
    expect(metadata.status).toBe(200);
    expect((await metadata.json() as { code_challenge_methods_supported: string[] }).code_challenge_methods_supported).toContain('S256');
  });

  it('exposes tool descriptions but never runs edits without OAuth', async () => {
    const headers = { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' };
    const listed = await request('/mcp', {
      method: 'POST', headers,
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
    });
    expect(listed.status).toBe(200);
    expect((await listed.json() as { result: { tools: { name: string }[] } }).result.tools.map(t => t.name)).toContain('add_step');
    const called = await request('/mcp', {
      method: 'POST', headers,
      body: JSON.stringify({
        jsonrpc: '2.0', id: 2, method: 'tools/call',
        params: { name: 'add_step', arguments: { itinerary_id: 'unknown', title: 'No permission', start_at: null } },
      }),
    });
    expect(called.status).toBe(401);
    expect(called.headers.get('WWW-Authenticate')).toContain('oauth-protected-resource');
  });

  it('does not register a client that redirects outside ChatGPT', async () => {
    const response = await request('/oauth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ redirect_uris: ['https://example.org/steal-token'] }),
    });
    expect(response.status).toBe(400);
  });
});
