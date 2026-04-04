import { sign, verify } from '@tsndr/cloudflare-worker-jwt';

export interface JwtPayload {
  type: 'itinerary';
  shioriId: string;
  iat: number;
  exp: number;
}

export interface UserJwtPayload {
  type: 'user';
  userId: string;
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
    type: 'itinerary',
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
    const { payload } = await verify(token, secret, { throwError: true }) as { payload: JwtPayload };

    if (payload.type !== 'itinerary' || !payload.shioriId || payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export async function generateUserToken(userId: string, secret?: string): Promise<string> {
  if (!secret) {
    throw new Error('JWT_SECRET is required');
  }
  const now = Math.floor(Date.now() / 1000);
  const payload: UserJwtPayload = {
    type: 'user',
    userId,
    iat: now,
    exp: now + TOKEN_EXPIRY,
  };

  return await sign(payload, secret);
}

export async function verifyUserToken(token: string, secret?: string): Promise<UserJwtPayload | null> {
  if (!secret) {
    throw new Error('JWT_SECRET is required');
  }
  try {
    const { payload } = await verify(token, secret, { throwError: true }) as { payload: UserJwtPayload };

    if (payload.type !== 'user' || !payload.userId || payload.exp < Math.floor(Date.now() / 1000)) {
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
