import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from '@simplewebauthn/browser';
import { userAuth } from './user-auth';

const API_BASE_URL =
  (import.meta.env.PUBLIC_API_URL as string | undefined) ||
  (import.meta.env.VITE_API_URL as string | undefined) ||
  'http://localhost:8787/api/v1';

export type Passkey = {
  id: string;
  created_at: string;
  last_used_at: string | null;
};

type Result<T> = { success: true; data: T } |
  { success: false; error: { code: string; message: string } };

async function request<T>(path: string, body?: unknown, authenticated = true, method = 'POST'): Promise<T> {
  const token = authenticated ? await userAuth.getToken() : null;
  const response = await fetch(`${API_BASE_URL}/passkeys${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const result = await response.json() as Result<T>;
  if (!result.success) throw new Error(result.error.code);
  return result.data;
}

async function browser() {
  const implementation = await import('@simplewebauthn/browser');
  if (!implementation.browserSupportsWebAuthn()) throw new Error('PASSKEY_NOT_SUPPORTED');
  return implementation;
}

export const passkeyAuth = {
  async available(): Promise<boolean> {
    try {
      const { available } = await request<{ available: boolean }>('/availability', undefined, false, 'GET');
      if (!available) return false;
      return (await browser()).browserSupportsWebAuthn();
    } catch {
      return false;
    }
  },

  async login(): Promise<void> {
    const { startAuthentication } = await browser();
    const { challengeId, options } = await request<{
      challengeId: string;
      options: PublicKeyCredentialRequestOptionsJSON;
    }>('/login/options', {}, false);
    const response = await startAuthentication({ optionsJSON: options });
    const { token } = await request<{ token: string }>(
      '/login/verify', { challengeId, response }, false,
    );
    await userAuth.signInWithCustomToken(token);
  },

  async register(): Promise<void> {
    const { startRegistration } = await browser();
    const { challengeId, options } = await request<{
      challengeId: string;
      options: PublicKeyCredentialCreationOptionsJSON;
    }>('/register/options', {});
    const response = await startRegistration({ optionsJSON: options });
    await request<{ id: string }>('/register/verify', { challengeId, response });
  },

  async list(): Promise<Passkey[]> {
    return (await request<{ passkeys: Passkey[] }>('/', undefined, true, 'GET')).passkeys;
  },

  async remove(id: string): Promise<void> {
    await request<{ removed: boolean }>(`/${encodeURIComponent(id)}`, undefined, true, 'DELETE');
  },
};
