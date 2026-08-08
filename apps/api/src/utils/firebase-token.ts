import { decodeProtectedHeader, importX509, jwtVerify, type JWTPayload } from 'jose';

const FIREBASE_CERTS_URL = 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';
const DEFAULT_CACHE_SECONDS = 60 * 60;

type CertificateCache = {
  certificates: Record<string, string>;
  expiresAt: number;
};

let certificateCache: CertificateCache | null = null;

export interface FirebaseIdTokenPayload extends JWTPayload {
  sub: string;
  email: string;
  email_verified: boolean;
  auth_time: number;
}

export async function verifyFirebaseIdToken(
  token: string,
  projectId?: string,
  fetchCertificates: typeof fetch = fetch,
): Promise<FirebaseIdTokenPayload | null> {
  if (!projectId) throw new Error('FIREBASE_PROJECT_ID is required');

  try {
    const header = decodeProtectedHeader(token);
    if (header.alg !== 'RS256' || !header.kid) return null;

    let certificate = (await getCertificates(fetchCertificates))[header.kid];
    if (!certificate) {
      certificateCache = null;
      certificate = (await getCertificates(fetchCertificates))[header.kid];
    }
    if (!certificate) return null;

    const key = await importX509(certificate, 'RS256');
    const { payload } = await jwtVerify(token, key, {
      algorithms: ['RS256'],
      audience: projectId,
      issuer: `https://securetoken.google.com/${projectId}`,
    });

    const now = Math.floor(Date.now() / 1000);
    if (
      typeof payload.sub !== 'string' || payload.sub.length === 0 || payload.sub.length > 128 ||
      typeof payload.email !== 'string' || payload.email.length === 0 ||
      typeof payload.email_verified !== 'boolean' ||
      typeof payload.iat !== 'number' || payload.iat > now ||
      typeof payload.auth_time !== 'number' || payload.auth_time > now
    ) {
      return null;
    }

    return payload as FirebaseIdTokenPayload;
  } catch {
    return null;
  }
}

async function getCertificates(fetchCertificates: typeof fetch): Promise<Record<string, string>> {
  if (certificateCache && certificateCache.expiresAt > Date.now()) return certificateCache.certificates;

  const response = await fetchCertificates(FIREBASE_CERTS_URL, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error('Unable to fetch Firebase public certificates');

  const certificates = await response.json<Record<string, string>>();
  const cacheSeconds = parseMaxAge(response.headers.get('Cache-Control')) ?? DEFAULT_CACHE_SECONDS;
  certificateCache = {
    certificates,
    expiresAt: Date.now() + cacheSeconds * 1000,
  };
  return certificates;
}

function parseMaxAge(cacheControl: string | null): number | null {
  const match = cacheControl?.match(/(?:^|,)\s*max-age=(\d+)/i);
  return match ? Number(match[1]) : null;
}

export function clearFirebaseCertificateCacheForTests(): void {
  certificateCache = null;
}
