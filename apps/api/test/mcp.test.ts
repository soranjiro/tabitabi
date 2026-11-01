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

  it('lists account-saved itineraries but never grants write access from a bookmark', async () => {
    // Keep the fixtures independent of the rest of the API test suites.
    await env.DB.exec(`
      CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, username TEXT NOT NULL, email TEXT NOT NULL, password_hash TEXT NOT NULL, prefecture TEXT, email_verified_at TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS itineraries (id TEXT PRIMARY KEY, title TEXT NOT NULL, theme_id TEXT NOT NULL, source_itinerary_id TEXT, password TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS user_bookmarks (user_id TEXT NOT NULL, itinerary_id TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, PRIMARY KEY(user_id,itinerary_id));
      CREATE TABLE IF NOT EXISTS itinerary_editor_grants (itinerary_id TEXT NOT NULL, user_id TEXT NOT NULL, granted_at TEXT NOT NULL, PRIMARY KEY(itinerary_id,user_id));
      CREATE TABLE IF NOT EXISTS mcp_oauth_tokens (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL, client_id TEXT NOT NULL, kind TEXT NOT NULL, resource TEXT NOT NULL, expires_at INTEGER NOT NULL);
    `.replaceAll('\\`','`'));
    const owner = crypto.randomUUID();
    const other = crypto.randomUUID();
    const saved = crypto.randomUUID();
    const editable = crypto.randomUUID();
    const unrelated = crypto.randomUUID();
    const now = new Date().toISOString();
    const bearer = crypto.randomUUID().replaceAll('-', '') + crypto.randomUUID().replaceAll('-', '');
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(bearer));
    const hash = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
    await env.DB.batch([
      env.DB.prepare('INSERT INTO users (id,username,email,password_hash,prefecture,email_verified_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)')
        .bind(owner, owner, owner + '@example.test', 'x', 'tokyo', now, now, now),
      env.DB.prepare('INSERT INTO users (id,username,email,password_hash,prefecture,email_verified_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)')
        .bind(other, other, other + '@example.test', 'x', 'tokyo', now, now, now),
      ...[[saved, '保存したしおり'], [editable, '編集可能なしおり'], [unrelated, '他人のしおり']].map(([id,title]) =>
        env.DB.prepare('INSERT INTO itineraries (id,title,theme_id,created_at,updated_at) VALUES (?,?,?,?,?)')
          .bind(id,title,'planning-draft',now,now)),
      env.DB.prepare('INSERT INTO user_bookmarks (user_id,itinerary_id,created_at,updated_at) VALUES (?,?,?,?)')
        .bind(owner,saved,now,now),
      env.DB.prepare('INSERT INTO user_bookmarks (user_id,itinerary_id,created_at,updated_at) VALUES (?,?,?,?)')
        .bind(other,unrelated,now,now),
      env.DB.prepare('INSERT INTO itinerary_editor_grants (itinerary_id,user_id,granted_at) VALUES (?,?,?)')
        .bind(editable,owner,now),
      env.DB.prepare('INSERT INTO mcp_oauth_tokens (token_hash,user_id,client_id,kind,resource,expires_at) VALUES (?,?,?,?,?,?)')
        .bind(hash,owner,'test-client','access','http://localhost/mcp',Date.now()+60_000),
    ]);
    const headers = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + bearer };
    const listResponse = await request('/mcp', {
      method: 'POST', headers, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'list_itineraries', arguments: {} } }),
    });
    expect(listResponse.status).toBe(200);
    const list = await listResponse.json() as { result: { content: Array<{ text: string }> } };
    const entries = JSON.parse(list.result.content[0]!.text) as Array<{ id: string; can_edit: boolean }>;
    expect(entries).toContainEqual(expect.objectContaining({ id: saved, can_edit: false }));
    expect(entries).toContainEqual(expect.objectContaining({ id: editable, can_edit: true }));
    expect(entries.some(entry => entry.id === unrelated)).toBe(false);

    const attemptedEdit = await request('/mcp', {
      method: 'POST', headers, body: JSON.stringify({
        jsonrpc: '2.0', id: 2, method: 'tools/call',
        params: { name: 'add_step', arguments: { itinerary_id: saved, title: '変更不可', start_at: null } },
      }),
    });
    const reply = await attemptedEdit.json() as { result: { isError: boolean } };
    expect(reply.result.isError).toBe(true);
  });

});
