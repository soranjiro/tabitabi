import { importPKCS8, SignJWT } from 'jose';
import { vi } from 'vitest';
import { clearFirebaseCertificateCacheForTests } from '../../src/utils/firebase-token';

const PROJECT_ID = 'tabitabi-test';
const KEY_ID = 'tabitabi-test-key';
const PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDnDd1k6ScvYBWZ
la+WZUvJZB3PsgKUq7jZS8J8FBPesdwfrjD9nmnQcNBcNU8HSThKhoOGxAIALFz1
vexQ8LATZP+k0IoMMEwCi3rjN5UEiwd7R8LE6naOIS1ayb58QqZwGNofzBPLaYOq
Djjjlp8m17KO68gpC66Kz606w3ZYUz96bkvGbvZRrsft2fQM/RKE37Z6E98d5saM
Iz4x6X44wnHvwvJIVnWW1PeBrzYQUejv3Qf6h48oOxo0F6g85fm+jWZwCKmxbg92
99DBarsmZHzhWb4mh8/wcBRq4lJbLzIYJXfHS1JF+agJK6dXxtxe6Z+BFuV1fYrS
mD05hZMLAgMBAAECggEARwTL+ChyEu3Ftd98iQ25rb1ILH7arDfcKW5P6TOCqACj
WFmCVXJLs/X5FV6NW//1fXK7GsFEnCkGqcIm0PoqJMv2iAJRbE2sD1wv+YcsFqll
M09rXnty1Vz9Q9qe4jLaVbpN0Vg4/V0BS1PzyICTiqziBWwTqgodLC2JYXaS+bKH
TWgaziPOj5R5Esdh7vHiBZRt9RRUCiTUgOoqpyAsMKE5jsy8FlU8mETi6RlePOiQ
2JVrrbRnrfOejifoLrJU8JlLMn99/kQqQ/zY2ErQonNBW5lq/mj9qWl8b9Qo+Gu8
mmPr5w9WQTBFujQVVc/8wEDvEDb0tYVD6kGyMmisAQKBgQD6ZTojvYVUkwNYPJ04
dnYH8lrtgKPcAz8FZwEPiS3PDSaJH/0QxmxmBSv6XK+9DIIOGds/6hm6IqI9SY0B
uXllus6bfGtFfduYMS25pA5oQ8HCqcqcjbf6BxjFdJEeKgqPFbMEZV0JcjK8qumV
CIw6zt6982uIUVsjG8jJTG2HoQKBgQDsOc/OsOLCpGaZSLd84U6AaZDwtRZtq+2E
Ej18USk9fs5pHcYmMjCUySbqQodpRzumxHC/sAv1hpJmjVTjojKUym1O+FvpNjAl
bY2JUv6s/3W95EH7rUxTvvTRysu0Ij1hQRFhJWWtRL+2+kuiWVQD+WZkFJuk9qnp
CreBFz/rKwKBgE4xonBa1PJOXrMFasuhIsbkhkS48XLZiKq1Of2SBz4riyczWCIO
9Pb/EnbCzxaoe0zQAkn5X0NjYWrmNyScuS5toeuodQ9keFkUsoTQmLcywaV6xI0T
LKrl4HR5LIBQ/K8mRZtP1DgI85M7hGpIGxKaW7DR/Xi6f019dbx3I5VBAoGBAOPj
gc5sZtZPs4r808bttMW9Ec6lZFW5HxHiZt6fjaF9y7MsvhPrJ2LiC2DDfc7aoXlo
2TyToXXjtSip/9L6jsFr57ffcQuy8w+oeHqaToami/f9VIpvzMqd1aDue0X0IjLI
ivOlGEnnoOvs2zpr4tlSqKy0FNM4AwKHDDDFNSyxAoGAbCLKxtFs/6VKlp/rPfeW
Tg9KVZ7Ddzl7LOwwLMOVPUIoq4/Dx2FW0eqni4YiDe3dfQVmM89KDV7xB2AbNviO
DgqZFsL814wMCKMlbIBEwz7ADhoqBt+pDBXnteMZLuwhL7N2oed1cIHQh/qAhA9z
cTCYDcvghMXpPLM1ZbwhFUE=
-----END PRIVATE KEY-----`;
const CERTIFICATE = `-----BEGIN CERTIFICATE-----
MIIDETCCAfmgAwIBAgIUHMNuo33jkcoGK1vKF2DQmDzQKHcwDQYJKoZIhvcNAQEL
BQAwGDEWMBQGA1UEAwwNdGFiaXRhYmktdGVzdDAeFw0yNjA4MDgxNzMxMDBaFw0z
NjA4MDUxNzMxMDBaMBgxFjAUBgNVBAMMDXRhYml0YWJpLXRlc3QwggEiMA0GCSqG
SIb3DQEBAQUAA4IBDwAwggEKAoIBAQDnDd1k6ScvYBWZla+WZUvJZB3PsgKUq7jZ
S8J8FBPesdwfrjD9nmnQcNBcNU8HSThKhoOGxAIALFz1vexQ8LATZP+k0IoMMEwC
i3rjN5UEiwd7R8LE6naOIS1ayb58QqZwGNofzBPLaYOqDjjjlp8m17KO68gpC66K
z606w3ZYUz96bkvGbvZRrsft2fQM/RKE37Z6E98d5saMIz4x6X44wnHvwvJIVnWW
1PeBrzYQUejv3Qf6h48oOxo0F6g85fm+jWZwCKmxbg9299DBarsmZHzhWb4mh8/w
cBRq4lJbLzIYJXfHS1JF+agJK6dXxtxe6Z+BFuV1fYrSmD05hZMLAgMBAAGjUzBR
MB0GA1UdDgQWBBRJGQLIYagvLlnhEmE2chaRKd1HPTAfBgNVHSMEGDAWgBRJGQLI
YagvLlnhEmE2chaRKd1HPTAPBgNVHRMBAf8EBTADAQH/MA0GCSqGSIb3DQEBCwUA
A4IBAQAAmryDbP8PJfcdsnnSi9RlfEMk39beg6HnntyYUPixDUeeGzYUx4Cn2Sde
e1NO0qYDFBodFKcCznTh4wfp+bS7QD0HULFdPl2Xfqp9+SSqoxRA/q0DHAN3p/ds
CcIga+C3/Pl7E9h3fh3APvspaz1w9/9aJ5nXis3hH80XrInpjg5J3T5biyZBf0bn
ub934Q2TZb+ITse1mqsanhvlsYF+SSAwKY+4FM7iHTnnffoud9+voij5OqiaKq9I
J+JZIBSO2aZlbpvi7+9mvwwGJnQanQ3MPCCKjPmj6sdHvEgDRUV7q7hnX4vHikqo
ouvX7+75yw6UCV0JfLx3n0YEsjlY
-----END CERTIFICATE-----`;

let privateKeyPromise: Promise<CryptoKey> | null = null;

export function installFirebaseCertMock(): void {
  clearFirebaseCertificateCacheForTests();
  const originalFetch = globalThis.fetch;
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    if (url === 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com') {
      return new Response(JSON.stringify({ [KEY_ID]: CERTIFICATE }), {
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3600' },
      });
    }
    return originalFetch(input, init);
  });
}

export async function createFirebaseToken(uid: string, email: string, emailVerified = true, overrides: { audience?: string; issuer?: string } = {}): Promise<string> {
  privateKeyPromise ??= importPKCS8(PRIVATE_KEY, 'RS256');
  const key = await privateKeyPromise;
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({ email, email_verified: emailVerified, auth_time: now })
    .setProtectedHeader({ alg: 'RS256', kid: KEY_ID })
    .setSubject(uid)
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .setAudience(overrides.audience ?? PROJECT_ID)
    .setIssuer(overrides.issuer ?? `https://securetoken.google.com/${PROJECT_ID}`)
    .sign(key);
}

export async function insertVerifiedUser(db: D1Database, username: string, email: string, prefecture = '東京都'): Promise<{ id: string; token: string }> {
  const id = `firebase-${username}`;
  const now = new Date().toISOString();
  await db.prepare(`INSERT INTO users (id, username, email, password_hash, prefecture, email_verified_at, created_at, updated_at)
    VALUES (?, ?, ?, '!firebase-managed!', ?, ?, ?, ?)`).bind(id, username, email, prefecture, now, now, now).run();
  return { id, token: await createFirebaseToken(id, email) };
}
