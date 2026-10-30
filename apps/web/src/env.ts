import { defineEnvVars } from '@sveltejs/kit/env';

// Firebase client configuration is public by design, not secret credentials.
// Firebase's public Web config is injected by GitHub Actions at build time.
// Keep these variables static: Cloudflare Pages does not receive the build-time
// GitHub secrets as runtime environment variables. Missing client config is
// permitted in isolated tests and rejected when auth starts.
const optionalString = (value: unknown): string => typeof value === 'string' ? value : '';

export const variables = defineEnvVars({
  PUBLIC_FIREBASE_API_KEY: { public: true, static: true, schema: optionalString },
  PUBLIC_FIREBASE_APP_ID: { public: true, static: true, schema: optionalString },
  PUBLIC_FIREBASE_AUTH_DOMAIN: { public: true, static: true, schema: optionalString },
  PUBLIC_FIREBASE_PROJECT_ID: { public: true, static: true, schema: optionalString },
});
