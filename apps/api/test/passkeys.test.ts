import { env } from 'cloudflare:test';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import app from '../src/index';
import { insertVerifiedUser, installFirebaseCertMock } from './helpers/firebase-auth';

beforeAll(() => installFirebaseCertMock());

const configuredEnv = () => ({
  ...env,
  FIREBASE_PROJECT_ID: 'tabitabi-test',
  PASSKEY_ORIGIN: 'http://localhost:5173',
  PASSKEY_RP_ID: 'localhost',
  FIREBASE_SERVICE_ACCOUNT_EMAIL: 'tabitabi-test@example.iam.gserviceaccount.com',
  FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY: 'not-a-real-secret',
});

async function tables() {
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL, email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL, prefecture TEXT, email_verified_at TEXT,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  )`).run();
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS user_passkeys (
    credential_id TEXT PRIMARY KEY, user_id TEXT NOT NULL, public_key TEXT NOT NULL,
    counter INTEGER NOT NULL DEFAULT 0, transports TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL, last_used_at TEXT
  )`).run();
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS passkey_challenges (
    id TEXT PRIMARY KEY, action TEXT NOT NULL, user_id TEXT, challenge TEXT NOT NULL,
    expires_at INTEGER NOT NULL, created_at INTEGER NOT NULL
  )`).run();
}

function post(path: string, data: object, token?: string, customEnv = configuredEnv()) {
  return app.request(`/api/v1/passkeys${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(data),
  }, customEnv);
}

describe('Passkey endpoints', () => {
  beforeEach(async () => {
    await tables();
    await env.DB.prepare('DELETE FROM passkey_challenges').run();
    await env.DB.prepare('DELETE FROM user_passkeys').run();
    await env.DB.prepare('DELETE FROM users').run();
  });

  it('fails closed when the RP ID and origin have not been configured', async () => {
    const res = await post('/login/options', {}, undefined, {
      ...configuredEnv(),
      PASSKEY_ORIGIN: undefined,
    });
    expect(res.status).toBe(503);
  });

  it('requires verified Firebase auth to register a passkey', async () => {
    const res = await post('/register/options', {});
    expect(res.status).toBe(401);
  });

  it('issues discoverable credential options without asking for an email', async () => {
    const res = await post('/login/options', {});
    expect(res.status).toBe(200);
    const json = await res.json() as {
      data: { challengeId: string; options: { challenge: string; allowCredentials?: unknown[] } };
    };
    expect(json.data.options.challenge.length).toBeGreaterThan(15);
    expect(json.data.options.allowCredentials ?? []).toHaveLength(0);
    const stored = await env.DB.prepare(
      'SELECT challenge FROM passkey_challenges WHERE id = ?',
    ).bind(json.data.challengeId).first<{ challenge: string }>();
    expect(stored?.challenge).toBe(json.data.options.challenge);
  });

  it('consumes a login challenge exactly once, even when authentication fails', async () => {
    const begin = await post('/login/options', {});
    const { data } = await begin.json() as { data: { challengeId: string } };
    const payload = {
      challengeId: data.challengeId,
      response: { id: 'unknown-credential', response: { userHandle: null } },
    };
    const first = await post('/login/verify', payload);
    const second = await post('/login/verify', payload);
    expect(first.status).toBe(400);
    expect(second.status).toBe(400);
    expect(await env.DB.prepare('SELECT id FROM passkey_challenges WHERE id = ?')
      .bind(data.challengeId).first()).toBeNull();
  });

  it('does not allow another account to remove an existing credential', async () => {
    const owner = await insertVerifiedUser(env.DB, 'ownerpk', 'ownerpk@example.com');
    const other = await insertVerifiedUser(env.DB, 'otherpk', 'otherpk@example.com');
    await env.DB.prepare(`INSERT INTO user_passkeys
      (credential_id, user_id, public_key, counter, transports, created_at)
      VALUES ('existingkey', ?, 'AQ', 0, '[]', ?)`).bind(owner.id, new Date().toISOString()).run();

    const forbidden = await app.request('/api/v1/passkeys/existingkey', {
      method: 'DELETE', headers: { Authorization: `Bearer ${other.token}` },
    }, configuredEnv());
    expect(forbidden.status).toBe(404);
    expect(await env.DB.prepare('SELECT credential_id FROM user_passkeys WHERE credential_id = ?')
      .bind('existingkey').first()).not.toBeNull();

    const removed = await app.request('/api/v1/passkeys/existingkey', {
      method: 'DELETE', headers: { Authorization: `Bearer ${owner.token}` },
    }, configuredEnv());
    expect(removed.status).toBe(200);
  });

  it('associates a new registration challenge only with the authenticated UID', async () => {
    const { id, token } = await insertVerifiedUser(env.DB, 'registerpk', 'registerpk@example.com');
    const res = await post('/register/options', {}, token);
    expect(res.status).toBe(200);
    const { data } = await res.json() as { data: { challengeId: string; options: { challenge: string } } };
    const stored = await env.DB.prepare('SELECT user_id, challenge FROM passkey_challenges WHERE id = ?')
      .bind(data.challengeId).first<{ user_id: string; challenge: string }>();
    expect(stored?.user_id).toBe(id);
    expect(stored?.challenge).toBe(data.options.challenge);
  });
});
