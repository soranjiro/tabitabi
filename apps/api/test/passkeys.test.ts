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


function base64Url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function derFromRawEcdsa(raw: Uint8Array): Uint8Array {
  function integer(bytes: Uint8Array): number[] {
    let start = 0;
    while (start < bytes.length - 1 && bytes[start] === 0) start++;
    const value = Array.from(bytes.slice(start));
    if (value[0] & 0x80) value.unshift(0);
    return [0x02, value.length, ...value];
  }
  const r = integer(raw.slice(0, 32));
  const s = integer(raw.slice(32, 64));
  return Uint8Array.from([0x30, r.length + s.length, ...r, ...s]);
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

  it('reports availability only when the exact origin and signing credentials exist', async () => {
    const ready = await app.request('/api/v1/passkeys/availability', {}, configuredEnv());
    expect(ready.status).toBe(200);
    expect((await ready.json() as { data: { available: boolean } }).data.available).toBe(true);

    const missing = await app.request('/api/v1/passkeys/availability', {}, {
      ...configuredEnv(), FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY: undefined,
    });
    expect((await missing.json() as { data: { available: boolean } }).data.available).toBe(false);
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


  it('verifies a genuine ECDSA assertion and mints a token for the existing Firebase UID', async () => {
    const user = await insertVerifiedUser(env.DB, 'validpk', 'validpk@example.com');
    const signingKeys = await crypto.subtle.generateKey({
      name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256',
    }, true, ['sign', 'verify']);
    const pkcs8 = new Uint8Array(await crypto.subtle.exportKey('pkcs8', signingKeys.privateKey));
    const serviceKey = '-----BEGIN PRIVATE KEY-----\\n' +
      btoa(String.fromCharCode(...pkcs8)).match(/.{1,64}/g)!.join('\\n') +
      '\\n-----END PRIVATE KEY-----';
    const passkeyKeys = await crypto.subtle.generateKey({
      name: 'ECDSA', namedCurve: 'P-256',
    }, true, ['sign', 'verify']);
    const publicJwk = await crypto.subtle.exportKey('jwk', passkeyKeys.publicKey);
    const x = Uint8Array.from(atob(publicJwk.x!.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
    const y = Uint8Array.from(atob(publicJwk.y!.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
    const cose = Uint8Array.from([0xa5, 0x01, 0x02, 0x03, 0x26, 0x20, 0x01,
      0x21, 0x58, 0x20, ...x, 0x22, 0x58, 0x20, ...y]);
    const id = base64Url(Uint8Array.from([5, 2, 17, 8, 99, 44, 7, 20]));
    await env.DB.prepare(`INSERT INTO user_passkeys
      (credential_id, user_id, public_key, counter, transports, created_at)
      VALUES (?, ?, ?, 0, '[]', ?)`)
      .bind(id, user.id, base64Url(cose), new Date().toISOString()).run();

    const begin = await post('/login/options', {});
    const { data } = await begin.json() as { data: { challengeId: string; options: { challenge: string } } };
    const rpHash = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode('localhost')));
    const authenticatorData = Uint8Array.from([...rpHash, 0x05, 0, 0, 0, 1]);
    const clientDataJSON = new TextEncoder().encode(JSON.stringify({
      type: 'webauthn.get', challenge: data.options.challenge, origin: 'http://localhost:5173',
      crossOrigin: false,
    }));
    const clientHash = new Uint8Array(await crypto.subtle.digest('SHA-256', clientDataJSON));
    const signedData = Uint8Array.from([...authenticatorData, ...clientHash]);
    const rawSignature = new Uint8Array(await crypto.subtle.sign(
      { name: 'ECDSA', hash: 'SHA-256' }, passkeyKeys.privateKey, signedData,
    ));

    const response = {
      id,
      rawId: id,
      type: 'public-key',
      clientExtensionResults: {},
      response: {
        authenticatorData: base64Url(authenticatorData),
        clientDataJSON: base64Url(clientDataJSON),
        signature: base64Url(derFromRawEcdsa(rawSignature)),
        userHandle: base64Url(new TextEncoder().encode(user.id)),
      },
    };
    const login = await post('/login/verify', { challengeId: data.challengeId, response }, undefined, {
      ...configuredEnv(), FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY: serviceKey,
    });
    expect(login.status).toBe(200);
    const { data: loggedIn } = await login.json() as { data: { token: string } };
    const { decodeJwt } = await import('jose');
    expect(decodeJwt(loggedIn.token).uid).toBe(user.id);

    const stored = await env.DB.prepare(
      'SELECT counter FROM user_passkeys WHERE credential_id = ?',
    ).bind(id).first<{ counter: number }>();
    expect(stored?.counter).toBe(1);
    const replay = await post('/login/verify', { challengeId: data.challengeId, response }, undefined, {
      ...configuredEnv(), FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY: serviceKey,
    });
    expect(replay.status).toBe(400);
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
