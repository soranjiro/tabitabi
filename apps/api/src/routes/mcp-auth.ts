import { Hono } from 'hono';
import type { Env } from '../utils';
import { verifyFirebaseIdToken } from '../utils/firebase-token';
import { extractBearerToken } from '../utils/jwt';

type Bindings = { Bindings: Env };
type AuthRequest = {
  id: string; client_id: string; redirect_uri: string; state: string;
  code_challenge: string; resource: string; expires_at: number;
};

const oauth = new Hono<Bindings>();
const AUTH_SCOPE = 'itineraries:read itineraries:write';
const ACCESS_LIFETIME = 60 * 60;
const REFRESH_LIFETIME = 30 * 24 * 60 * 60;

function issuer(c: { req: { url: string } }) {
  return new URL(c.req.url).origin;
}
export function mcpResource(c: { req: { url: string } }) {
  return issuer(c) + '/mcp';
}
function siteOrigin(c: { env: Env }) {
  return c.env.APP_ORIGIN || 'http://localhost:5173';
}
function token() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}
async function sha256(value: string) {
  const data = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, '0')).join('');
}
async function pkce(value: string) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  const bytes = new Uint8Array(hash);
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function validRedirect(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 2048) return false;
  try {
    const url = new URL(value);
    if (url.username || url.password || url.hash || url.protocol !== 'https:' || url.hostname !== 'chatgpt.com') return false;
    return url.pathname === '/connector_platform_oauth_redirect' || /^\/connector\/oauth\/[a-zA-Z0-9_-]+$/.test(url.pathname);
  } catch { return false; }
}
function noStore(c: { header: (key: string, value: string) => void }) {
  c.header('Cache-Control', 'no-store');
  c.header('Pragma', 'no-cache');
}
function errorResponse(message: string, status = 400) {
  return Response.json({ error: message }, { status, headers: { 'Cache-Control': 'no-store' } });
}

oauth.get('/.well-known/oauth-protected-resource', c => c.json({
  resource: mcpResource(c),
  authorization_servers: [issuer(c)],
  scopes_supported: ['itineraries:read', 'itineraries:write'],
  bearer_methods_supported: ['header'],
}));
oauth.get('/.well-known/oauth-protected-resource/mcp', c => c.json({
  resource: mcpResource(c),
  authorization_servers: [issuer(c)],
  scopes_supported: ['itineraries:read', 'itineraries:write'],
  bearer_methods_supported: ['header'],
}));
oauth.get('/.well-known/oauth-authorization-server', c => c.json({
  issuer: issuer(c),
  authorization_endpoint: issuer(c) + '/oauth/authorize',
  token_endpoint: issuer(c) + '/oauth/token',
  registration_endpoint: issuer(c) + '/oauth/register',
  response_types_supported: ['code'],
  grant_types_supported: ['authorization_code', 'refresh_token'],
  code_challenge_methods_supported: ['S256'],
  token_endpoint_auth_methods_supported: ['none'],
  scopes_supported: ['itineraries:read', 'itineraries:write'],
  authorization_response_iss_parameter_supported: true,
}));

// Dynamic registration is limited to known ChatGPT OAuth callback URLs.
oauth.post('/oauth/register', async c => {
  const raw = await c.req.text();
  if (raw.length > 4096) return errorResponse('invalid_client_metadata');
  let data: Record<string, unknown>;
  try { data = JSON.parse(raw); } catch { return errorResponse('invalid_client_metadata'); }
  const redirects = data.redirect_uris;
  if (!Array.isArray(redirects) || redirects.length < 1 || redirects.length > 4 || !redirects.every(validRedirect)) {
    return errorResponse('invalid_redirect_uri');
  }
  const clientId = token();
  await c.env.DB.prepare('INSERT INTO mcp_oauth_clients (client_id, redirect_uris, created_at) VALUES (?, ?, ?)')
    .bind(clientId, JSON.stringify(redirects), Date.now()).run();
  noStore(c);
  return c.json({
    client_id: clientId,
    client_id_issued_at: Math.floor(Date.now() / 1000),
    redirect_uris: redirects,
    token_endpoint_auth_method: 'none',
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
  }, 201);
});

oauth.get('/oauth/authorize', async c => {
  const q = c.req.query();
  const { client_id: clientId, redirect_uri: redirectUri, state, code_challenge: challenge } = q;
  if (!clientId || !redirectUri || !validRedirect(redirectUri) ||
    typeof state !== 'string' || !state || state.length > 1024 ||
    q.response_type !== 'code' || q.code_challenge_method !== 'S256' ||
    !challenge || !/^[A-Za-z0-9_-]{43}$/.test(challenge) ||
    (q.resource && q.resource !== mcpResource(c)) ||
    (q.scope && q.scope !== AUTH_SCOPE)) return errorResponse('invalid_request');
  const client = await c.env.DB.prepare('SELECT redirect_uris FROM mcp_oauth_clients WHERE client_id = ?')
    .bind(clientId).first<{ redirect_uris: string }>();
  if (!client || !JSON.parse(client.redirect_uris).includes(redirectUri)) return errorResponse('invalid_client');
  const id = token();
  await c.env.DB.prepare('INSERT INTO mcp_oauth_requests (id, client_id, redirect_uri, state, code_challenge, resource, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(id, clientId, redirectUri, state, challenge, mcpResource(c), Date.now() + 10 * 60_000).run();
  noStore(c);
  return c.redirect(siteOrigin(c) + '/connect/chatgpt?request=' + encodeURIComponent(id), 302);
});

oauth.get('/oauth/request/:id', async c => {
  const request = await c.env.DB.prepare('SELECT id, expires_at FROM mcp_oauth_requests WHERE id = ?')
    .bind(c.req.param('id')).first<{ id: string; expires_at: number }>();
  noStore(c);
  if (!request || request.expires_at < Date.now()) return errorResponse('expired_request', 404);
  return c.json({ service: 'ChatGPT', scope: 'しおりの閲覧・予定の追加と編集', expires_at: request.expires_at });
});

oauth.post('/oauth/approve', async c => {
  const jwt = extractBearerToken(c.req.header('Authorization'));
  const profile = jwt && await verifyFirebaseIdToken(jwt, c.env.FIREBASE_PROJECT_ID);
  if (!profile?.email_verified) return errorResponse('login_required', 401);
  const user = await c.env.DB.prepare('SELECT id FROM users WHERE id = ? AND email_verified_at IS NOT NULL AND prefecture IS NOT NULL')
    .bind(profile.sub).first();
  if (!user) return errorResponse('profile_required', 403);
  const raw = await c.req.text();
  if (raw.length > 1024) return errorResponse('invalid_request');
  let body: { request?: string };
  try { body = JSON.parse(raw); } catch { return errorResponse('invalid_request'); }
  if (!body?.request || !/^[a-f0-9]{64}$/.test(body.request)) return errorResponse('invalid_request');
  // Single-use: never let a stolen request ID silently mint more than one authorization code.
  const result = await c.env.DB.prepare('DELETE FROM mcp_oauth_requests WHERE id = ? AND expires_at > ? RETURNING *')
    .bind(body.request, Date.now()).first<AuthRequest>();
  if (!result) return errorResponse('expired_request', 404);
  const code = token();
  await c.env.DB.prepare('INSERT INTO mcp_oauth_codes (code_hash, client_id, user_id, redirect_uri, code_challenge, resource, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(await sha256(code), result.client_id, profile.sub, result.redirect_uri, result.code_challenge, result.resource, Date.now() + 5 * 60_000).run();
  const url = new URL(result.redirect_uri);
  url.searchParams.set('code', code);
  url.searchParams.set('state', result.state);
  url.searchParams.set('iss', issuer(c));
  noStore(c);
  return c.json({ redirect_url: url.toString() });
});

oauth.post('/oauth/token', async c => {
  const raw = await c.req.text();
  if (raw.length > 4096) return errorResponse('invalid_request');
  const form = new URLSearchParams(raw);
  const grant = form.get('grant_type');
  const clientId = form.get('client_id');
  if (!clientId) return errorResponse('invalid_client', 401);
  const client = await c.env.DB.prepare('SELECT client_id FROM mcp_oauth_clients WHERE client_id = ?')
    .bind(clientId).first();
  if (!client) return errorResponse('invalid_client', 401);
  let userId: string;
  let resource: string;
  if (grant === 'authorization_code') {
    const code = form.get('code');
    const redirectUri = form.get('redirect_uri');
    const verifier = form.get('code_verifier');
    if (!code || !verifier || !/^[A-Za-z0-9._~-]{43,128}$/.test(verifier)) return errorResponse('invalid_grant');
    const row = await c.env.DB.prepare('DELETE FROM mcp_oauth_codes WHERE code_hash = ? AND expires_at > ? RETURNING *')
      .bind(await sha256(code), Date.now()).first<{
        client_id: string; user_id: string; redirect_uri: string; code_challenge: string; resource: string;
      }>();
    if (!row || row.client_id !== clientId || row.redirect_uri !== redirectUri || await pkce(verifier) !== row.code_challenge ||
      (form.get('resource') && form.get('resource') !== row.resource)) return errorResponse('invalid_grant');
    userId = row.user_id;
    resource = row.resource;
  } else if (grant === 'refresh_token') {
    const refresh = form.get('refresh_token');
    if (!refresh) return errorResponse('invalid_grant');
    const row = await c.env.DB.prepare("DELETE FROM mcp_oauth_tokens WHERE token_hash = ? AND kind = 'refresh' AND expires_at > ? RETURNING *")
      .bind(await sha256(refresh), Date.now()).first<{ client_id: string; user_id: string; resource: string }>();
    if (!row || row.client_id !== clientId || (form.get('resource') && form.get('resource') !== row.resource)) return errorResponse('invalid_grant');
    userId = row.user_id;
    resource = row.resource;
  } else return errorResponse('unsupported_grant_type');
  if (resource !== mcpResource(c)) return errorResponse('invalid_target');
  const access = token();
  const refresh = token();
  const now = Date.now();
  await c.env.DB.batch([
    c.env.DB.prepare('INSERT INTO mcp_oauth_tokens (token_hash, user_id, client_id, kind, resource, expires_at) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(await sha256(access), userId, clientId, 'access', resource, now + ACCESS_LIFETIME * 1000),
    c.env.DB.prepare('INSERT INTO mcp_oauth_tokens (token_hash, user_id, client_id, kind, resource, expires_at) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(await sha256(refresh), userId, clientId, 'refresh', resource, now + REFRESH_LIFETIME * 1000),
  ]);
  noStore(c);
  return c.json({ access_token: access, token_type: 'Bearer', expires_in: ACCESS_LIFETIME, refresh_token: refresh, scope: AUTH_SCOPE });
});

export async function mcpUserId(c: { req: { header: (key: string) => string | undefined; url: string }; env: Env }) {
  const bearer = extractBearerToken(c.req.header('Authorization'));
  if (!bearer || !/^[a-f0-9]{64}$/.test(bearer)) return null;
  const row = await c.env.DB.prepare("SELECT user_id FROM mcp_oauth_tokens WHERE token_hash = ? AND kind = 'access' AND expires_at > ? AND resource = ?")
    .bind(await sha256(bearer), Date.now(), mcpResource(c)).first<{ user_id: string }>();
  return row?.user_id ?? null;
}

export default oauth;
