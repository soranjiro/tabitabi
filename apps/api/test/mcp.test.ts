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
      CREATE TABLE IF NOT EXISTS mcp_oauth_clients (client_id TEXT PRIMARY KEY, redirect_uris TEXT NOT NULL, created_at INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS steps (id TEXT PRIMARY KEY, itinerary_id TEXT NOT NULL, title TEXT NOT NULL, start_at INTEGER NOT NULL, end_at INTEGER NOT NULL, scheduled_start_at INTEGER, scheduled_end_at INTEGER, time_unspecified INTEGER NOT NULL DEFAULT 0, location TEXT, notes TEXT, notes_text TEXT, link TEXT, type TEXT, is_all_day INTEGER NOT NULL DEFAULT 0, pin_latitude REAL, pin_longitude REAL, is_priority INTEGER NOT NULL DEFAULT 0, sort_order REAL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
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
      env.DB.prepare('INSERT INTO mcp_oauth_clients (client_id,redirect_uris,created_at) VALUES (?,?,?)')
        .bind('test-client','[]',Date.now()),
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
    expect(entries.find(entry => entry.id === editable)).toEqual(expect.objectContaining({
      url: 'https://tabitabi.pages.dev/' + editable,
    }));
    expect(entries.find(entry => entry.id === saved)).toEqual(expect.objectContaining({
      url: 'https://tabitabi.pages.dev/s/' + saved,
    }));

    // A complete shared URL (including a fragment) resolves to the same grant.
    const addByUrl = await request('/mcp', {
      method: 'POST', headers, body: JSON.stringify({
        jsonrpc: '2.0', id: 10, method: 'tools/call',
        params: { name: 'add_step', arguments: {
          itinerary_id: 'https://tabitabi.pages.dev/s/' + editable + '#schedule',
          title: 'MCP URLから追加', start_at: null, end_at: null,
        } },
      }),
    });
    expect(addByUrl.status).toBe(200);
    const added = await addByUrl.json() as { result: { content: Array<{ text: string }>; isError: boolean } };
    expect(added.result.isError).toBe(false);
    const created = JSON.parse(added.result.content[0]!.text) as { id: string; saved: boolean };
    expect(created.saved).toBe(true);
    const row = await env.DB.prepare('SELECT title FROM steps WHERE id = ? AND itinerary_id = ?')
      .bind(created.id, editable).first<{ title: string }>();
    expect(row?.title).toBe('MCP URLから追加');

    const updateByUrl = await request('/mcp', {
      method: 'POST', headers, body: JSON.stringify({
        jsonrpc: '2.0', id: 11, method: 'tools/call',
        params: { name: 'update_step', arguments: {
          itinerary_id: 'https://tabitabi.pages.dev/' + editable,
          step_id: created.id, title: 'URLから更新済み',
        } },
      }),
    });
    const updated = await updateByUrl.json() as { result: { isError: boolean } };
    expect(updated.result.isError).toBe(false);
    const verified = await env.DB.prepare('SELECT title FROM steps WHERE id = ?')
      .bind(created.id).first<{ title: string }>();
    expect(verified?.title).toBe('URLから更新済み');

    // A forged external host cannot be turned into an itinerary edit.
    const external = await request('/mcp', {
      method: 'POST', headers, body: JSON.stringify({
        jsonrpc: '2.0', id: 12, method: 'tools/call',
        params: { name: 'add_step', arguments: {
          itinerary_id: 'https://tabitabi.pages.dev.attacker.example/s/' + editable,
          title: '不正', start_at: null,
        } },
      }),
    });
    const rejectedExternal = await external.json() as { result: { isError: boolean; content: Array<{ text: string }> } };
    expect(rejectedExternal.result.isError).toBe(true);
    expect(rejectedExternal.result.content[0]!.text).toContain('正しいしおりID');

    const after = await env.DB.prepare('SELECT COUNT(*) AS count FROM steps WHERE itinerary_id = ?')
      .bind(editable).first<{ count: number }>();
    expect(after?.count).toBe(1);

    const attemptedEdit = await request('/mcp', {
      method: 'POST', headers, body: JSON.stringify({
        jsonrpc: '2.0', id: 2, method: 'tools/call',
        params: { name: 'add_step', arguments: { itinerary_id: 'https://tabitabi.pages.dev/s/' + saved + '#money', title: '変更不可', start_at: null } },
      }),
    });
    const reply = await attemptedEdit.json() as { result: { isError: boolean } };
    expect(reply.result.isError).toBe(true);
    const denial = await env.DB.prepare('SELECT COUNT(*) AS count FROM steps WHERE itinerary_id = ?')
      .bind(saved).first<{ count: number }>();
    expect(denial?.count).toBe(0);

    const revoked = await request('/oauth/revoke', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: 'test-client', token: bearer }).toString(),
    });
    expect(revoked.status).toBe(200);
    const afterRevoke = await request('/mcp', {
      method: 'POST', headers, body: JSON.stringify({
        jsonrpc: '2.0', id: 13, method: 'tools/call',
        params: { name: 'list_itineraries', arguments: {} },
      }),
    });
    expect(afterRevoke.status).toBe(401);
  });

});
