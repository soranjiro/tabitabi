import { sign, verify } from '@tsndr/cloudflare-worker-jwt';

export interface JwtPayload {
  shioriId: string;
  iat: number;
  exp: number;
}

const DEFAULT_SECRET = 'tabitabi-default-secret-change-in-production';
const TOKEN_EXPIRY = 30 * 24 * 60 * 60;

export async function generateToken(shioriId: string, secret?: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload: JwtPayload = {
    shioriId,
    iat: now,
    exp: now + TOKEN_EXPIRY,
  };

  return await sign(payload, secret || DEFAULT_SECRET);
}

export async function verifyToken(token: string, secret?: string): Promise<JwtPayload | null> {
  try {
    const isValid = await verify(token, secret || DEFAULT_SECRET);
    if (!isValid) return null;

    const { payload } = await verify(token, secret || DEFAULT_SECRET, { throwError: true }) as { payload: JwtPayload };

    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export function extractBearerToken(authHeader?: string): string | null {
  if (!authHeader?.startsWith('Bearer ')) return null;
  return authHeader.substring(7);
}
