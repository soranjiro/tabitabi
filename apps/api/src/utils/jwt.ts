import { sign, verify } from '@tsndr/cloudflare-worker-jwt';

export interface JwtPayload {
  shioriId: string;
  iat: number;
  exp: number;
}

const TOKEN_EXPIRY = 30 * 24 * 60 * 60;

export async function generateToken(shioriId: string, secret?: string): Promise<string> {
  if (!secret) {
    throw new Error('JWT_SECRET is required');
  }
  const now = Math.floor(Date.now() / 1000);
  const payload: JwtPayload = {
    shioriId,
    iat: now,
    exp: now + TOKEN_EXPIRY,
  };

  return await sign(payload, secret);
}

export async function verifyToken(token: string, secret?: string): Promise<JwtPayload | null> {
  if (!secret) {
    throw new Error('JWT_SECRET is required');
  }
  try {
    const isValid = await verify(token, secret);
    if (!isValid) return null;

    const { payload } = await verify(token, secret, { throwError: true }) as { payload: JwtPayload };

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
